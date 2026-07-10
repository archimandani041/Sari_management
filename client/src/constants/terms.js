/**
 * KP Creation — Terminology Constants
 * Single source of truth for all user-facing labels.
 * Import from here instead of hardcoding strings per component.
 */

// ── Movement type labels (user-facing) ────────────────────────
export const MOVEMENT_LABELS = {
  STOCK_IN: 'Stock In',
  DELIVERY_OUT: 'Delivery Out',
  CORRECTION: 'Correction',
  REVERSAL: 'Reversal',
};

// ── Internal DB / audit terms (only for History filter dropdowns) ─
export const AUDIT_ACTION_LABELS = {
  Increase: 'Stock In',
  Decrease: 'Delivery Out',
  'Stock Added': 'Stock In',
  'Stock Delivered': 'Delivery Out',
  'Manual Edit': 'Correction',
  Undo: 'Reversal',
};

// ── Stock Request statuses ─────────────────────────────────────
export const REQUEST_STATUSES = ['Requested', 'Confirmed', 'Received', 'Cancelled'];

export const REQUEST_STATUS_COLORS = {
  Requested: 'warning',
  Confirmed: 'info',
  Received: 'success',
  Cancelled: 'error',
};

// ── Combination status labels ──────────────────────────────────
export const COMBO_STATUS_LABELS = {
  'In Stock': 'In Stock',
  'In Delivery': 'In Delivery',
  'Out of Stock': 'Out of Stock',
  'Low Stock': 'Low Stock',
};

// ── Stock health thresholds → status classification ───────────
export const getStockHealth = (current, minimum = 0) => {
  if (current <= 0) return { label: 'Out of Stock', severity: 'error', color: '#EF4444' };
  if (current <= minimum) return { label: 'Low Stock', severity: 'warning', color: '#F59E0B' };
  return { label: 'Healthy', severity: 'success', color: '#22C55E' };
};

// ── Movement type to color mapping ────────────────────────────
export const MOVEMENT_COLORS = {
  STOCK_IN: 'success',
  DELIVERY_OUT: 'warning',
};
