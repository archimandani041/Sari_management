-- =============================================
-- Migration: Add Stock Actions V3 Columns
-- Supports 'Stock', 'Delivery', 'Stock Delivery' and future extensibility
-- =============================================

ALTER TABLE stock_history 
  ADD COLUMN IF NOT EXISTS quantity INTEGER,
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS machine TEXT,
  ADD COLUMN IF NOT EXISTS operator_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Remove CHECK constraint on action column if it exists so any future action ('Stock', 'Delivery', 'Stock Delivery', 'Return', 'Damage', 'Transfer', 'Adjustment', 'Sample') is permitted
DO $$ 
BEGIN
    ALTER TABLE stock_history DROP CONSTRAINT IF EXISTS stock_history_action_check;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
