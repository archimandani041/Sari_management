-- ============================================================
-- DATABASE UNIQUE CONSTRAINTS MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Clean duplicate sarees (keeping the latest one by created_at)
DELETE FROM sarees a USING sarees b
WHERE a.created_at < b.created_at AND a.series_code = b.series_code;

-- Enforce UNIQUE(series_code) on sarees
ALTER TABLE sarees 
ADD CONSTRAINT sarees_series_code_key UNIQUE (series_code);


-- 2. Clean duplicate beams (keeping the latest one)
DELETE FROM beams a USING beams b
WHERE a.created_at < b.created_at AND a.saree_id = b.saree_id AND a.beam_name = b.beam_name;

-- Enforce UNIQUE(saree_id, beam_name) on beams
ALTER TABLE beams 
ADD CONSTRAINT beams_saree_id_beam_name_key UNIQUE (saree_id, beam_name);


-- 3. Clean duplicate combinations (keeping the latest one)
DELETE FROM combinations a USING combinations b
WHERE a.created_at < b.created_at 
  AND a.beam_id = b.beam_id 
  AND COALESCE(a.combination_name, '') = COALESCE(b.combination_name, '');

-- Enforce UNIQUE(beam_id, combination_name) on combinations
ALTER TABLE combinations 
ADD CONSTRAINT combinations_beam_id_combination_name_key UNIQUE (beam_id, combination_name);


-- 4. Clean duplicate combination colors (keeping the latest one)
DELETE FROM combination_colors a USING combination_colors b
WHERE a.created_at < b.created_at AND a.combination_id = b.combination_id AND a.f_number = b.f_number;

-- Enforce UNIQUE(combination_id, f_number) on combination_colors
ALTER TABLE combination_colors 
ADD CONSTRAINT combination_colors_combination_id_f_number_key UNIQUE (combination_id, f_number);
