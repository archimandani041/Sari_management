const express = require('express');
const router = express.Router();
const { getStockRequests, createStockRequest, updateRequestStatus, deleteStockRequest } = require('../controllers/stockRequestController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getStockRequests);
router.post('/', authenticate, createStockRequest);
router.patch('/:id/status', authenticate, authorize('admin'), updateRequestStatus);
router.delete('/:id', authenticate, authorize('admin'), deleteStockRequest);

module.exports = router;
