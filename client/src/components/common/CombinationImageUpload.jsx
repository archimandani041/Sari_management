/**
 * CombinationImageUpload — V2
 * Supports: Clipboard Paste (Ctrl+V), Drag & Drop, Browse
 * Features: Client-side compression, progress, zoom preview, replace, delete
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { combinationImageAPI } from '../../services/api';
import {
  Box, Typography, IconButton, CircularProgress, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip,
  Snackbar, Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import ImageIcon from '@mui/icons-material/Image';

// ─── Client-side image compression ────────────────────────────────────────────
const compressImage = (file, maxWidth = 1200, quality = 0.85) =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        const out = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() });
        resolve(out.size < file.size ? out : file);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

// ─── Main Component ────────────────────────────────────────────────────────────
const CombinationImageUpload = ({
  comboId,
  imageUrl: initialUrl = '',
  seriesCode = '',
  beamName = '',
  onUploaded,
  onDeleted,
  isAdmin = false,
  disabled = false,
  compact = false,
}) => {
  const [imageUrl, setImageUrl] = useState(initialUrl || '');
  const [localPreview, setLocalPreview] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);
  const zoneRef = useRef(null);

  // Sync prop changes
  useEffect(() => { if (initialUrl && !pendingFile) setImageUrl(initialUrl); }, [initialUrl]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (file) => {
    if (!ALLOWED.includes(file.type)) { setError('Only JPG, PNG or WEBP images are allowed.'); return false; }
    if (file.size > MAX_BYTES) { setError('Maximum image size is 5 MB.'); return false; }
    setError('');
    return true;
  };

  // ── Core upload / local preview ─────────────────────────────────────────────
  const handleFile = useCallback(async (raw) => {
    if (!raw || !validate(raw)) return;
    setError('');

    // Compress first
    const file = await compressImage(raw);

    // --- No comboId: local preview mode (SareeForm add flow) ---
    if (!comboId) {
      const blobUrl = URL.createObjectURL(file);
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(blobUrl);
      setPendingFile(file);
      onUploaded?.(null, file);
      return;
    }

    // --- Live upload ---
    setUploading(true); setProgress(10);
    const tick = setInterval(() => setProgress(p => Math.min(p + 12, 88)), 220);
    try {
      const { data } = await combinationImageAPI.upload(comboId, file, { seriesCode, beamName });
      clearInterval(tick); setProgress(100);
      setTimeout(() => setProgress(0), 700);
      setImageUrl(data.url);
      setLocalPreview('');
      setPendingFile(null);
      onUploaded?.(data.url);
      setSnack('Image uploaded successfully.');
    } catch (e) {
      setError(e.response?.data?.error || 'Image upload failed. Please try again.');
    } finally {
      clearInterval(tick);
      setUploading(false);
    }
  }, [comboId, seriesCode, beamName, onUploaded, localPreview]);

  // ── Clipboard paste ─────────────────────────────────────────────────────────
  const handlePaste = useCallback((e) => {
    if (disabled || uploading) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    let imageFile = null;
    for (const item of items) {
      if (item.type.startsWith('image/')) { imageFile = item.getAsFile(); break; }
    }
    if (imageFile) { e.preventDefault(); handleFile(imageFile); }
    else setError('No image found in clipboard.');
  }, [disabled, uploading, handleFile]);

  // Listen for paste globally when zone is focused
  useEffect(() => {
    if (!focused) return;
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [focused, handlePaste]);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!comboId) {
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(''); setPendingFile(null);
      onDeleted?.(); setDeleteOpen(false); return;
    }
    setDeleting(true);
    try {
      await combinationImageAPI.delete(comboId);
      setImageUrl(''); setLocalPreview('');
      onDeleted?.(); setSnack('Image deleted.');
    } catch (e) { setError(e.response?.data?.error || 'Delete failed.'); }
    finally { setDeleting(false); setDeleteOpen(false); }
  };

  const display = localPreview || imageUrl;
  const hasImage = !!display;

  // ─── COMPACT MODE (SareeForm) ──────────────────────────────────────────────
  if (compact) {
    return (
      <Box>
        {hasImage ? (
          <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
            <Box component="img" src={display} alt="preview"
              sx={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} loading="lazy" />
            <Box sx={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent,rgba(0,0,0,0.6))',
              display: 'flex', justifyContent: 'flex-end', gap: 0.5, p: 0.75
            }}>
              <Tooltip title="Replace"><IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)' }}
                onClick={() => fileInputRef.current?.click()} disabled={disabled}>
                <SwapHorizIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Remove"><IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(220,38,38,0.5)' }}
                onClick={() => { if (localPreview) URL.revokeObjectURL(localPreview); setLocalPreview(''); setPendingFile(null); onDeleted?.(); }}>
                <DeleteOutlinedIcon fontSize="small" /></IconButton></Tooltip>
            </Box>
          </Box>
        ) : (
          <Box
            ref={zoneRef}
            tabIndex={0}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={handlePaste}
            onClick={() => !disabled && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            sx={{
              border: '1.5px dashed', borderColor: dragOver || focused ? 'primary.main' : 'divider',
              borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer',
              bgcolor: dragOver ? 'rgba(59,17,26,0.06)' : focused ? 'rgba(59,17,26,0.03)' : 'background.default',
              transition: 'all 0.15s', outline: 'none',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(59,17,26,0.04)' }
            }}
          >
            <ContentPasteIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }} />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 700 }}>
              Paste · Drop · Browse
            </Typography>
            <Typography variant="caption" display="block" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
              Ctrl+V from WhatsApp
            </Typography>
          </Box>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        {error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>{error}</Typography>}
      </Box>
    );
  }

  // ─── FULL MODE (SareeEdit) ─────────────────────────────────────────────────
  return (
    <Box>
      {uploading && <LinearProgress variant="determinate" value={progress} sx={{ mb: 1, borderRadius: 1, height: 3 }} />}

      {hasImage ? (
        /* ── Has image: preview with overlay ── */
        <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Box component="img" src={display} alt="Combination image" loading="lazy"
            sx={{ width: '100%', height: 200, objectFit: 'cover', display: 'block', transition: 'transform 0.25s', '&:hover': { transform: 'scale(1.02)' } }} />
          {/* Overlay */}
          <Box sx={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent,rgba(0,0,0,0.7))',
            p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', fontWeight: 600 }}>
              Ctrl+V to replace • Drag to replace
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Zoom"><IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                onClick={() => setPreviewOpen(true)}><ZoomInIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Replace image"><IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                onClick={() => fileInputRef.current?.click()} disabled={disabled || uploading}><SwapHorizIcon fontSize="small" /></IconButton></Tooltip>
              {isAdmin && (
                <Tooltip title="Delete image"><IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(220,38,38,0.5)', '&:hover': { bgcolor: 'rgba(220,38,38,0.8)' } }}
                  onClick={() => setDeleteOpen(true)} disabled={disabled || deleting}>
                  {deleting ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <DeleteOutlinedIcon fontSize="small" />}
                </IconButton></Tooltip>
              )}
            </Box>
          </Box>
          {/* Invisible paste/drop overlay when has image */}
          <Box
            tabIndex={0}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            sx={{
              position: 'absolute', inset: 0, outline: 'none',
              border: dragOver ? '3px solid' : 'none',
              borderColor: 'primary.main',
              bgcolor: dragOver ? 'rgba(59,17,26,0.3)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            {dragOver && <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.1rem', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Drop to replace</Typography>}
          </Box>
        </Box>
      ) : (
        /* ── No image: upload zone ── */
        <Box
          ref={zoneRef}
          tabIndex={0}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={handlePaste}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          sx={{
            border: '2px dashed',
            borderColor: dragOver ? 'primary.main' : focused ? 'primary.light' : 'divider',
            borderRadius: 2, height: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 1, cursor: disabled || uploading ? 'default' : 'pointer',
            bgcolor: dragOver ? 'rgba(59,17,26,0.06)' : focused ? 'rgba(59,17,26,0.02)' : 'background.default',
            transition: 'all 0.15s', outline: 'none',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(59,17,26,0.04)' }
          }}
        >
          {uploading ? (
            <CircularProgress size={36} />
          ) : (
            <>
              <Box sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: 'rgba(59,17,26,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {focused ? <ContentPasteIcon sx={{ color: 'primary.main', fontSize: 28 }} /> : <CloudUploadIcon sx={{ color: 'primary.main', fontSize: 28 }} />}
              </Box>
              <Box sx={{ textAlign: 'center', px: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {focused ? 'Press Ctrl+V to paste' : 'Click, Drag, or Paste'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  📋 Ctrl+V from WhatsApp &nbsp;·&nbsp; 🖱 Drag & Drop &nbsp;·&nbsp; 📁 Browse
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.65rem', mt: 0.25 }}>
                  JPG · PNG · WEBP &nbsp;·&nbsp; Max 5 MB
                </Typography>
              </Box>
            </>
          )}
        </Box>
      )}

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

      {error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, fontWeight: 600 }}>{error}</Typography>}

      {/* Zoom dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: 'black', borderRadius: 3 } }}>
        <Box sx={{ position: 'relative' }}>
          <Box component="img" src={display} alt="Full preview"
            sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }} />
          <IconButton onClick={() => setPreviewOpen(false)}
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.15)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
            ✕
          </IconButton>
        </Box>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Image?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently remove this image from storage and cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success snackbar */}
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack('')} severity="success" variant="filled" sx={{ borderRadius: 2 }}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CombinationImageUpload;
