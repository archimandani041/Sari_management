const express = require('express');
const router = express.Router();
const {
  getSarees, getSareeById, createSaree, updateSaree, deleteSaree, nextSeries,
  addBeam, updateBeam, deleteBeam,
  addCombination, updateCombination, deleteCombination, advancedSearch
} = require('../controllers/sareeController');
const { authenticate, authorize } = require('../middleware/auth');

// Saree routes
router.get('/', authenticate, getSarees);
router.get('/search/advanced', authenticate, advancedSearch);
router.get('/:id', authenticate, getSareeById);
router.post('/', authenticate, authorize('admin'), createSaree);
router.put('/:id', authenticate, authorize('admin'), updateSaree);
router.delete('/:id', authenticate, authorize('admin'), deleteSaree);
router.patch('/:id/next-series', authenticate, authorize('admin'), nextSeries);

// Beam routes (nested under saree)
router.post('/:id/beams', authenticate, authorize('admin'), addBeam);

// Beam routes (by beamId)
router.put('/beams/:beamId', authenticate, authorize('admin'), updateBeam);
router.delete('/beams/:beamId', authenticate, authorize('admin'), deleteBeam);

// Combination routes (nested under beam)
router.post('/beams/:beamId/combinations', authenticate, authorize('admin'), addCombination);

// Combination routes (by comboId)
router.put('/combinations/:comboId', authenticate, authorize('admin'), updateCombination);
router.delete('/combinations/:comboId', authenticate, authorize('admin'), deleteCombination);

module.exports = router;
