const express = require('express');
const router = express.Router();
const {
  getSarees, getSareeById, createSaree, updateSaree, deleteSaree, nextSeries,
  addBeam, updateBeam, deleteBeam,
  addCombination, updateCombination, deleteCombination, advancedSearch, setSeries
} = require('../controllers/sareeController');
const { authenticate, authorize } = require('../middleware/auth');

// Saree routes
router.get('/', authenticate, getSarees);
router.get('/search/advanced', authenticate, advancedSearch);
// Beam routes (by beamId)
router.post('/', authenticate, authorize('admin', 'staff'), createSaree);
router.put('/beams/:beamId', authenticate, authorize('admin', 'staff'), updateBeam);
router.delete('/beams/:beamId', authenticate, authorize('admin', 'staff'), deleteBeam);

// Combination routes (nested under beam)
router.post('/beams/:beamId/combinations', authenticate, authorize('admin', 'staff'), addCombination);

// Combination routes (by comboId)
router.put('/combinations/:comboId', authenticate, authorize('admin', 'staff'), updateCombination);
router.delete('/combinations/:comboId', authenticate, authorize('admin', 'staff'), deleteCombination);

// Saree dynamic routes
router.get('/:id', authenticate, getSareeById);
router.put('/:id', authenticate, authorize('admin', 'staff'), updateSaree);
router.delete('/:id', authenticate, authorize('admin', 'staff'), deleteSaree);
router.patch('/:id/next-series', authenticate, authorize('admin', 'staff'), nextSeries);
router.patch('/:id/set-series', authenticate, authorize('admin', 'staff'), setSeries);

// Beam routes (nested under saree)
router.post('/:id/beams', authenticate, authorize('admin', 'staff'), addBeam);

module.exports = router;
