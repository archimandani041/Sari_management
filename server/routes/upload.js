const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage, uploadCombinationImage, deleteCombinationImage } = require('../controllers/uploadController');
const { authenticate, authorize } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Middleware to handle Multer errors gracefully
const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
};

// Saree-level image (admin only)
router.post('/', authenticate, authorize('admin'), handleUpload, uploadImage);

// Combination-level image upload (supports both /combination/:comboId and /combinations/:comboId)
router.post('/combination/:comboId', authenticate, authorize('admin', 'staff'), handleUpload, uploadCombinationImage);
router.post('/combinations/:comboId', authenticate, authorize('admin', 'staff'), handleUpload, uploadCombinationImage);

// Combination-level image delete
router.delete('/combination/:comboId', authenticate, authorize('admin'), deleteCombinationImage);
router.delete('/combinations/:comboId', authenticate, authorize('admin'), deleteCombinationImage);

module.exports = router;
