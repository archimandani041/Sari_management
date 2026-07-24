const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage, uploadCombinationImage, deleteCombinationImage } = require('../controllers/uploadController');
const { authenticate, authorize } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Saree-level image (admin only)
router.post('/', authenticate, authorize('admin'), upload.single('image'), uploadImage);

// Combination-level image upload
router.post('/combination/:comboId', authenticate, authorize('admin', 'staff'), upload.single('image'), uploadCombinationImage);

// Combination-level image delete
router.delete('/combination/:comboId', authenticate, authorize('admin'), deleteCombinationImage);

module.exports = router;
