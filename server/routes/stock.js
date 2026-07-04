const express = require('express');
const router = express.Router();
const { updateStock, undoStockChange, getHistory } = require('../controllers/stockController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateStockUpdate } = require('../middleware/validation');

router.patch('/update', authenticate, validateStockUpdate, updateStock);
router.patch('/undo/:historyId', authenticate, authorize('admin'), undoStockChange);
router.get('/history', authenticate, getHistory);

module.exports = router;
