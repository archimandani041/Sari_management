/**
 * Upload Controller - handles image uploads to Supabase Storage
 * Supports:
 *   - Saree-level images (existing bucket: saree-images)
 *   - Per-combination images (bucket: sari-combination-images)
 */
const { supabase } = require('../config/supabase');
const path = require('path');
const { randomUUID } = require('crypto');

const SAREE_BUCKET = 'saree-images';
const COMBO_BUCKET = 'sari-combination-images';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// ─── Existing: Saree-level image upload ───────────────────────────────────────
const uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!ALLOWED_TYPES.includes(req.file.mimetype))
      return res.status(400).json({ error: 'Only JPG, PNG or WEBP images up to 5 MB are allowed.' });
    if (req.file.size > MAX_SIZE)
      return res.status(400).json({ error: 'Only JPG, PNG or WEBP images up to 5 MB are allowed.' });

    const ext = path.extname(req.file.originalname);
    const filePath = `sarees/${randomUUID()}${ext}`;

    const { error } = await supabase.storage
      .from(SAREE_BUCKET)
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from(SAREE_BUCKET).getPublicUrl(filePath);
    res.json({ url: urlData.publicUrl, path: filePath });
  } catch (error) {
    console.error('uploadImage error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

// ─── New: Combination-level image upload ──────────────────────────────────────
// POST /api/upload/combination/:comboId
// Body: multipart/form-data  field: image
// Query params (optional): seriesCode, beamName  — used to build folder path
const uploadCombinationImage = async (req, res) => {
  try {
    console.log('[uploadCombinationImage] Starting upload for comboId:', req.params.comboId);

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!ALLOWED_TYPES.includes(req.file.mimetype))
      return res.status(400).json({ error: 'Only JPG, PNG or WEBP images up to 5 MB are allowed.' });
    if (req.file.size > MAX_SIZE)
      return res.status(400).json({ error: 'Only JPG, PNG or WEBP images up to 5 MB are allowed.' });

    const { comboId } = req.params;
    const seriesCode = (req.query.seriesCode || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
    const beamName = (req.query.beamName || 'beam').replace(/[^a-zA-Z0-9_-]/g, '-');

    // 1. Verify the combination exists (service_role key bypasses RLS)
    let { data: combo, error: comboErr } = await supabase
      .from('combinations')
      .select('id, owner_id')
      .eq('id', comboId)
      .maybeSingle();

    console.log('[uploadCombinationImage] DB lookup result:', { combo, comboErr });

    if (comboErr) {
      console.error('Combination query error:', comboErr);
      return res.status(500).json({ error: `Database error: ${comboErr.message}` });
    }
    if (!combo) {
      console.error(`Combination ${comboId} not found for user ${req.user?.id} (owner ${req.user?.owner_id})`);
      return res.status(404).json({ error: 'Combination not found' });
    }

    if (combo.owner_id && combo.owner_id !== req.user.owner_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // 2. Upload image to storage: sari-combination-images/{seriesCode}/{beamName}/{comboId}.{ext}
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filePath = `${seriesCode}/${beamName}/${comboId}${ext}`;

    console.log('[uploadCombinationImage] Uploading to storage:', filePath);

    const { error: uploadErr } = await supabase.storage
      .from(COMBO_BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });
    if (uploadErr) {
      console.error('Supabase storage upload error:', uploadErr);
      return res.status(500).json({ error: `Storage upload failed: ${uploadErr.message}` });
    }

    const { data: urlData } = supabase.storage.from(COMBO_BUCKET).getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // 3. Persist url & path back to the combination row
    const updateData = {
      image_url: publicUrl,
      image_path: filePath,
      image_uploaded_at: new Date().toISOString(),
      image_uploaded_by: req.user.id
    };
    if (!combo.owner_id) updateData.owner_id = req.user.owner_id;

    const { error: updateErr } = await supabase
      .from('combinations')
      .update(updateData)
      .eq('id', comboId);

    if (updateErr) {
      console.error('Supabase DB update error:', updateErr);
      // If the image columns don't exist yet, return a helpful message
      if (updateErr.code === '42703' || updateErr.message?.includes('image_url')) {
        return res.status(400).json({
          error: 'Database migration needed: Run the ALTER TABLE statement to add image_url/image_path columns to combinations.'
        });
      }
      throw updateErr;
    }

    console.log('[uploadCombinationImage] Success:', publicUrl);
    res.json({ url: publicUrl, path: filePath });
  } catch (error) {
    console.error('uploadCombinationImage error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload combination image' });
  }
};

// ─── Delete combination image ─────────────────────────────────────────────────
// DELETE /api/upload/combination/:comboId
const deleteCombinationImage = async (req, res) => {
  try {
    const { comboId } = req.params;

    // Only admin can delete
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can delete images' });

    const { data: combo, error: comboErr } = await supabase
      .from('combinations')
      .select('id, image_path, owner_id')
      .eq('id', comboId)
      .maybeSingle();

    if (comboErr || !combo) return res.status(404).json({ error: 'Combination not found' });
    if (combo.owner_id && combo.owner_id !== req.user.owner_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!combo.image_path) return res.status(400).json({ error: 'No image to delete' });

    // Delete from storage
    await supabase.storage.from(COMBO_BUCKET).remove([combo.image_path]);

    // Clear DB columns
    const { error: updateErr } = await supabase
      .from('combinations')
      .update({ image_url: null, image_path: null, image_uploaded_at: null, image_uploaded_by: null })
      .eq('id', comboId);
    if (updateErr) throw updateErr;

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('deleteCombinationImage error:', error);
    res.status(500).json({ error: 'Failed to delete combination image' });
  }
};

module.exports = { uploadImage, uploadCombinationImage, deleteCombinationImage };
