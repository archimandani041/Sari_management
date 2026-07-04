-- ============================================================
-- ADD STATUS AND BRAND COLUMNS TO COMBINATIONS TABLE
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Clean up/remove status and brand columns from sarees if they were previously added
ALTER TABLE sarees DROP COLUMN IF EXISTS status;
ALTER TABLE sarees DROP COLUMN IF EXISTS brand;

-- Add status and brand columns to combinations table
ALTER TABLE combinations 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'In Stock' CHECK (status IN ('In Stock', 'In Delivery'));

ALTER TABLE combinations 
ADD COLUMN IF NOT EXISTS brand VARCHAR(50) DEFAULT 'KP' CHECK (brand IN ('KP', 'KPR'));
