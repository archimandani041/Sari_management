const express = require('express');
const router = express.Router();
const {
  getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier,
  getSuppliersByCombo, linkSupplierToCombo, unlinkSupplierFromCombo
} = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

// Supplier CRUD
router.get('/', authenticate, getSuppliers);
router.get('/:id', authenticate, getSupplierById);
router.post('/', authenticate, authorize('admin', 'staff'), createSupplier);
router.put('/:id', authenticate, authorize('admin', 'staff'), updateSupplier);
router.delete('/:id', authenticate, authorize('admin', 'staff'), deleteSupplier);

// Combination-Supplier mapping
router.get('/combination/:comboId', authenticate, getSuppliersByCombo);
router.post('/combination/:comboId', authenticate, authorize('admin', 'staff'), linkSupplierToCombo);
router.delete('/combination/:comboId/:supplierId', authenticate, authorize('admin', 'staff'), unlinkSupplierFromCombo);

module.exports = router;
