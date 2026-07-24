/**
 * CombinationImageUpload
 * ─────────────────────────────────────────────────────────
 * A premium drag-and-drop image uploader for per-combination images.
 *
 * Props:
 *   comboId       – UUID of the combination (required when combo already exists in DB)
 *   imageUrl      – current image URL (if any)
 *   seriesCode    – e.g. "KS526"  (used for storage folder)
 *   beamName      – e.g. "White Beam" (used for storage folder)
 *   onUploaded    – (newUrl) => void — called after successful upload
 *   onDeleted     – () => void — called after successful delete
 *   isAdmin       – boolean — only admins can delete
 *   disabled      – boolean
 *   compact       – boolean — use smaller layout (for SareeForm "add" mode preview only)
 */
import { useState, useRef, useCallback } from 'react';
import { combinationImageAPI } from '../../services/api';
import {
  Box, Typography, IconButton, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, LinearProgress, Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ImageIcon from '@mui/icons-material/Image';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

const CombinationImageUpload = ({
  comboId,
  imageUrl: initialImageUrl,
  seriesCode = '',
  beamName = '',
  onUploaded,
  onDeleted,
  isAdmin = false,
  disabled = false,
  compact = false
}) => {
  const [imageUrl, setImageUrl] = useState(initialImageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // local blob preview before upload (for "add" mode before combo exists in DB)
  const [localPreview, setLocalPreview] = useState('');
  const [pendingFile, setPendingFile] = useState(null);

  const fileInputRef = useRef(null);

  // Sync external imageUrl prop changes (e.g. parent reloads data)
  // Only override if we don't have a local pending state
  useState(() => {
    if (initialImageUrl && !pendingFile) setImageUrl(initialImageUrl);
  });

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG or WEBP images up to 5 MB are allowed.');
      return false;
    }
    if (file.size > MAX_SIZE) {
      setError('Only JPG, PNG or WEBP images up to 5 MB are allowed.');
      return false;
    }
    setError('');
    return true;
  };

  const handleFile = useCallback(async (file) => {
    if (!file || !validateFile(file)) return;

    // If no comboId yet (add-mode), just show local preview
    if (!comboId) {
      const url = URL.createObjectURL(file);
      setLocalPreview(url);
      setPendingFile(file);
      onUploaded && onUploaded(null, file); // pass raw file to parent
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    try {
      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 15, 85));
      }, 200);

      const { data } = await combinationImageAPI.upload(comboId, file, { seriesCode, beamName });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 600);

      setImageUrl(data.url);
      setLocalPreview('');
      setPendingFile(null);
      onUploaded && onUploaded(data.url);
    } catch (e) {
      setError(e.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [comboId, seriesCode, beamName, onUploaded]);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleDelete = async () => {
    if (!comboId) {
      // local-only, just clear
      setLocalPreview('');
      setPendingFile(null);
      onDeleted && onDeleted();
      setDeleteConfirmOpen(false);
      return;
    }
    setDeleting(true);
    try {
      await combinationImageAPI.delete(comboId);
      setImageUrl('');
      setLocalPreview('');
      setPendingFile(null);
      onDeleted && onDeleted();
    } catch (e) {
      setError(e.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const displayUrl = localPreview || imageUrl;
  const hasImage = !!displayUrl;

  // ─── Compact mode (SareeForm before submission) ────────────────────────────
  if (compact) {
    return (
      <Box>
        {hasImage ? (
          <Box sx={{ position: 'relative', width: '100%', pt: '56.25%', borderRadius: 2, overflow: 'hidden', bgcolor: 'grey.100' }}>
            <Box
              component="img"
              src={displayUrl}
              alt="Combination preview"
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
            <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5 }}>
              <Tooltip title="Replace image">
                <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'white' } }}
                  onClick={() => fileInputRef.current?.click()} disabled={disabled}>
                  <SwapHorizIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove image">
                <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'white' } }}
                  onClick={() => { setLocalPreview(''); setPendingFile(null); onDeleted && onDeleted(); }} disabled={disabled}>
                  <DeleteOutlineIcon fontSize="small" color="error" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ) : (
          <Box
            onClick={() => !disabled && fileInputRef.current?.click()}
            sx={{
              border: '1.5px dashed', borderColor: dragOver ? 'primary.main' : 'divider',
              borderRadius: 2, p: 2, textAlign: 'center', cursor: disabled ? 'default' : 'pointer',
              bgcolor: dragOver ? 'primary.50' : 'background.default',
              transition: 'all 0.15s',
              '&:hover': { borderColor: disabled ? 'divider' : 'primary.main', bgcolor: disabled ? 'background.default' : 'primary.50' }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <ImageIcon sx={{ color: 'text.disabled', mb: 0.5, fontSize: 28 }} />
            <Typography variant="caption" display="block" color="text.secondary">
              Add Image (Optional)
            </Typography>
          </Box>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFileInput} />
        {error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>{error}</Typography>}
      </Box>
    );
  }

  // ─── Full mode (SareeEdit / SareeDetail) ──────────────────────────────────
  return (
    <Box>
      {/* Upload progress bar */}
      {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 1, borderRadius: 1, height: 3 }} />}

      {hasImage ? (
        /* ── Has image: show preview with overlay actions ── */
        <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
          <Box
            component="img"
            src={displayUrl}
            alt="Combination image"
            loading="lazy"
            sx={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.25s',
              '&:hover': { transform: 'scale(1.02)' }
            }}
          />
          {/* Overlay action bar */}
          <Box sx={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
            p: 1, display: 'flex', justifyContent: 'flex-end', gap: 0.75
          }}>
            <Tooltip title="View full image">
              <IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                onClick={() => setPreviewOpen(true)}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Replace image">
              <IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                onClick={() => fileInputRef.current?.click()} disabled={disabled || uploading}>
                <SwapHorizIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {isAdmin && (
              <Tooltip title="Delete image">
                <IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(220,38,38,0.5)', '&:hover': { bgcolor: 'rgba(220,38,38,0.8)' } }}
                  onClick={() => setDeleteConfirmOpen(true)} disabled={disabled || deleting}>
                  {deleting ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <DeleteOutlineIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      ) : (
        /* ── No image: drag-and-drop zone ── */
        <Box
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            border: '2px dashed',
            borderColor: dragOver ? 'primary.main' : 'divider',
            borderRadius: 2,
            height: 180,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            cursor: disabled || uploading ? 'default' : 'pointer',
            bgcolor: dragOver ? 'primary.50' : 'background.default',
            transition: 'all 0.15s ease',
            '&:hover': {
              borderColor: disabled || uploading ? 'divider' : 'primary.main',
              bgcolor: disabled || uploading ? 'background.default' : 'rgba(59,17,26,0.04)'
            }
          }}
        >
          {uploading ? (
            <CircularProgress size={32} />
          ) : (
            <>
              <Box sx={{
                width: 48, height: 48, borderRadius: '12px',
                bgcolor: 'rgba(59,17,26,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CloudUploadIcon sx={{ color: 'primary.main', fontSize: 26 }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', textAlign: 'center', px: 2 }}>
                Click or Drag Image Here
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                JPG, PNG or WEBP • max 5 MB
              </Typography>
            </>
          )}
        </Box>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        hidden
        onChange={handleFileInput}
      />

      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, fontWeight: 600 }}>
          {error}
        </Typography>
      )}

      {/* Full-size preview dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: 'black', borderRadius: 3 } }}>
        <Box sx={{ position: 'relative' }}>
          <Box component="img" src={displayUrl} alt="Full size preview"
            sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }} />
          <IconButton onClick={() => setPreviewOpen(false)}
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.15)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
            ✕
          </IconButton>
        </Box>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Image?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently remove the image from storage. This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CombinationImageUpload;
