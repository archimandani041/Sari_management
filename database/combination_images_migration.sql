-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add per-combination image support
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add image columns to combinations table
ALTER TABLE combinations
  ADD COLUMN IF NOT EXISTS image_url        TEXT,
  ADD COLUMN IF NOT EXISTS image_path       TEXT,
  ADD COLUMN IF NOT EXISTS image_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create the Supabase Storage bucket for combination images
-- (Run this from the Supabase dashboard: Storage → New Bucket → sari-combination-images, Public)
-- Or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('sari-combination-images', 'sari-combination-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_combinations_image_url ON combinations (image_url) WHERE image_url IS NOT NULL;

-- 4. Confirm
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'combinations'
  AND column_name IN ('image_url', 'image_path', 'image_uploaded_at', 'image_uploaded_by')
ORDER BY column_name;
