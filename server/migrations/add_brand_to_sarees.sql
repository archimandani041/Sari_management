-- Add brand column to sarees table for saree-level brand (KP / KPR)
-- Run this in Supabase SQL Editor

ALTER TABLE sarees ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT 'KP';

-- Optional: update existing sarees to inherit brand from their combinations
-- (takes the most common brand across all combinations of that saree)
UPDATE sarees s
SET brand = (
  SELECT c.brand
  FROM combinations c
  JOIN beams b ON c.beam_id = b.id
  WHERE b.saree_id = s.id
  GROUP BY c.brand
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
WHERE brand IS NULL OR brand = 'KP';
