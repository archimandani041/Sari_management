/**
 * Upload Controller - handles image uploads to Supabase Storage
 */
const { supabase } = require('../config/supabase');
const path = require('path');
const { randomUUID } = require('crypto');

const BUCKET_NAME = 'saree-images';

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only jpg, jpeg, png, webp files are allowed' });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be less than 5MB' });
    }

    const ext = path.extname(req.file.originalname);
    const fileName = `${randomUUID()}${ext}`;
    const filePath = `sarees/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    res.json({ url: urlData.publicUrl, path: filePath });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

module.exports = { uploadImage };
