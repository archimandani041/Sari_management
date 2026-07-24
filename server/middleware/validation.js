/**
 * Input Validation Middleware
 * Validates request bodies for saree and stock operations
 */

const validateSaree = (req, res, next) => {
  const { sari_name, series_base, series_letter } = req.body;
  const errors = [];

  if (!sari_name || sari_name.trim().length === 0) {
    errors.push('Sari name is required');
  }
  if (!series_base || series_base.trim().length === 0) {
    errors.push('Series base code is required');
  }
  if (series_letter && !/^[A-Z]{1,5}$/i.test(series_letter)) {
    errors.push('Series letter must be 1-5 alphabetic characters');
  }
  if (req.body.current_stock !== undefined && req.body.current_stock < 0) {
    errors.push('Current stock cannot be negative');
  }
  if (req.body.minimum_stock !== undefined && req.body.minimum_stock < 0) {
    errors.push('Minimum stock cannot be negative');
  }
  if (req.body.maximum_stock !== undefined && req.body.maximum_stock < 0) {
    errors.push('Maximum stock cannot be negative');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  next();
};

const validateStockUpdate = (req, res, next) => {
  const { saree_id, combination_id, action, quantity } = req.body;
  const errors = [];

  if (!combination_id && !saree_id) errors.push('Combination ID or Saree ID is required');
  if (!action || typeof action !== 'string' || action.trim().length === 0) {
    errors.push('Action name is required (e.g. Stock, Delivery, Stock Delivery)');
  }
  if (quantity === undefined || quantity === null || isNaN(parseInt(quantity))) {
    errors.push('Valid numeric quantity is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  next();
};

module.exports = { validateSaree, validateStockUpdate };

