-- ============================================================
-- KP Creation — Multi-Tenant Data Isolation Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- WHAT THIS DOES:
--   1. Adds owner_id to sarees, suppliers, stock_history, stock_requests
--   2. Backfills existing rows (assigns them to created_by user)
--   3. Makes the UNIQUE constraint on series_code per-owner
--   4. Enables Row Level Security on all owned tables
--   5. Creates RLS policies so each user sees only their own data
--   6. Child tables (beams, combinations, colors) are secured
--      through their parent saree via the JOIN relationship;
--      the service-role backend enforces ownership checks in code.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Add owner_id to root tables
-- ─────────────────────────────────────────────────────────────

-- SAREES
ALTER TABLE sarees ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill: assign existing sarees to the user who created them (if any)
UPDATE sarees SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;

-- SUPPLIERS
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill suppliers
UPDATE suppliers SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;

-- STOCK_HISTORY
ALTER TABLE stock_history ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill stock_history
UPDATE stock_history SET owner_id = changed_by WHERE owner_id IS NULL AND changed_by IS NOT NULL;

-- STOCK_REQUESTS
ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill stock_requests
UPDATE stock_requests SET owner_id = requested_by WHERE owner_id IS NULL AND requested_by IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Fix the series_code uniqueness constraint
-- series_code must be unique PER OWNER, not globally.
-- Drop old unique constraint and replace with composite one.
-- ─────────────────────────────────────────────────────────────

-- Drop existing unique constraint on (series_base, series_letter) — was global
ALTER TABLE sarees DROP CONSTRAINT IF EXISTS sarees_series_base_series_letter_key;

-- Add per-owner uniqueness: each owner can have one KS526D
ALTER TABLE sarees DROP CONSTRAINT IF EXISTS sarees_series_owner_unique;
ALTER TABLE sarees ADD CONSTRAINT sarees_series_owner_unique UNIQUE (series_base, series_letter, owner_id);

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Indexes for performance
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sarees_owner ON sarees(owner_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_owner ON suppliers(owner_id);
CREATE INDEX IF NOT EXISTS idx_history_owner ON stock_history(owner_id);
CREATE INDEX IF NOT EXISTS idx_requests_owner ON stock_requests(owner_id);

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Enable RLS on all owned tables
-- Note: The backend uses the service_role key which BYPASSES RLS
-- by default. These policies add a defense-in-depth layer and
-- are enforced for any anon/user-key access.
-- The backend enforces ownership in application code (safe).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE sarees ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE beams ENABLE ROW LEVEL SECURITY;
ALTER TABLE combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE combination_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE combination_suppliers ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- STEP 5: RLS Policies — Root tables (direct owner_id check)
-- ─────────────────────────────────────────────────────────────

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "sarees_owner_select" ON sarees;
DROP POLICY IF EXISTS "sarees_owner_insert" ON sarees;
DROP POLICY IF EXISTS "sarees_owner_update" ON sarees;
DROP POLICY IF EXISTS "sarees_owner_delete" ON sarees;

CREATE POLICY "sarees_owner_select" ON sarees FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "sarees_owner_insert" ON sarees FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "sarees_owner_update" ON sarees FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "sarees_owner_delete" ON sarees FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "suppliers_owner_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_owner_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_owner_update" ON suppliers;
DROP POLICY IF EXISTS "suppliers_owner_delete" ON suppliers;

CREATE POLICY "suppliers_owner_select" ON suppliers FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "suppliers_owner_insert" ON suppliers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "suppliers_owner_update" ON suppliers FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "suppliers_owner_delete" ON suppliers FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "stock_history_owner_select" ON stock_history;
DROP POLICY IF EXISTS "stock_history_owner_insert" ON stock_history;

CREATE POLICY "stock_history_owner_select" ON stock_history FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "stock_history_owner_insert" ON stock_history FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "stock_requests_owner_select" ON stock_requests;
DROP POLICY IF EXISTS "stock_requests_owner_insert" ON stock_requests;
DROP POLICY IF EXISTS "stock_requests_owner_update" ON stock_requests;
DROP POLICY IF EXISTS "stock_requests_owner_delete" ON stock_requests;

CREATE POLICY "stock_requests_owner_select" ON stock_requests FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "stock_requests_owner_insert" ON stock_requests FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "stock_requests_owner_update" ON stock_requests FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "stock_requests_owner_delete" ON stock_requests FOR DELETE USING (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────
-- STEP 6: RLS Policies — Child tables (via parent saree join)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "beams_owner_select" ON beams;
DROP POLICY IF EXISTS "beams_owner_insert" ON beams;
DROP POLICY IF EXISTS "beams_owner_update" ON beams;
DROP POLICY IF EXISTS "beams_owner_delete" ON beams;

CREATE POLICY "beams_owner_select" ON beams FOR SELECT
  USING (EXISTS (SELECT 1 FROM sarees WHERE sarees.id = beams.saree_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "beams_owner_insert" ON beams FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sarees WHERE sarees.id = beams.saree_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "beams_owner_update" ON beams FOR UPDATE
  USING (EXISTS (SELECT 1 FROM sarees WHERE sarees.id = beams.saree_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "beams_owner_delete" ON beams FOR DELETE
  USING (EXISTS (SELECT 1 FROM sarees WHERE sarees.id = beams.saree_id AND sarees.owner_id = auth.uid()));

DROP POLICY IF EXISTS "combinations_owner_select" ON combinations;
DROP POLICY IF EXISTS "combinations_owner_insert" ON combinations;
DROP POLICY IF EXISTS "combinations_owner_update" ON combinations;
DROP POLICY IF EXISTS "combinations_owner_delete" ON combinations;

CREATE POLICY "combinations_owner_select" ON combinations FOR SELECT
  USING (EXISTS (SELECT 1 FROM beams JOIN sarees ON sarees.id = beams.saree_id WHERE beams.id = combinations.beam_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "combinations_owner_insert" ON combinations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM beams JOIN sarees ON sarees.id = beams.saree_id WHERE beams.id = combinations.beam_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "combinations_owner_update" ON combinations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM beams JOIN sarees ON sarees.id = beams.saree_id WHERE beams.id = combinations.beam_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "combinations_owner_delete" ON combinations FOR DELETE
  USING (EXISTS (SELECT 1 FROM beams JOIN sarees ON sarees.id = beams.saree_id WHERE beams.id = combinations.beam_id AND sarees.owner_id = auth.uid()));

DROP POLICY IF EXISTS "combo_colors_owner_select" ON combination_colors;
DROP POLICY IF EXISTS "combo_colors_owner_insert" ON combination_colors;
DROP POLICY IF EXISTS "combo_colors_owner_update" ON combination_colors;
DROP POLICY IF EXISTS "combo_colors_owner_delete" ON combination_colors;

CREATE POLICY "combo_colors_owner_select" ON combination_colors FOR SELECT
  USING (EXISTS (SELECT 1 FROM combinations JOIN beams ON beams.id = combinations.beam_id JOIN sarees ON sarees.id = beams.saree_id WHERE combinations.id = combination_colors.combination_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "combo_colors_owner_insert" ON combination_colors FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM combinations JOIN beams ON beams.id = combinations.beam_id JOIN sarees ON sarees.id = beams.saree_id WHERE combinations.id = combination_colors.combination_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "combo_colors_owner_update" ON combination_colors FOR UPDATE
  USING (EXISTS (SELECT 1 FROM combinations JOIN beams ON beams.id = combinations.beam_id JOIN sarees ON sarees.id = beams.saree_id WHERE combinations.id = combination_colors.combination_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "combo_colors_owner_delete" ON combination_colors FOR DELETE
  USING (EXISTS (SELECT 1 FROM combinations JOIN beams ON beams.id = combinations.beam_id JOIN sarees ON sarees.id = beams.saree_id WHERE combinations.id = combination_colors.combination_id AND sarees.owner_id = auth.uid()));

DROP POLICY IF EXISTS "combo_suppliers_owner_select" ON combination_suppliers;
DROP POLICY IF EXISTS "combo_suppliers_owner_insert" ON combination_suppliers;
DROP POLICY IF EXISTS "combo_suppliers_owner_delete" ON combination_suppliers;

CREATE POLICY "combo_suppliers_owner_select" ON combination_suppliers FOR SELECT
  USING (EXISTS (SELECT 1 FROM combinations JOIN beams ON beams.id = combinations.beam_id JOIN sarees ON sarees.id = beams.saree_id WHERE combinations.id = combination_suppliers.combination_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "combo_suppliers_owner_insert" ON combination_suppliers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM combinations JOIN beams ON beams.id = combinations.beam_id JOIN sarees ON sarees.id = beams.saree_id WHERE combinations.id = combination_suppliers.combination_id AND sarees.owner_id = auth.uid()));
CREATE POLICY "combo_suppliers_owner_delete" ON combination_suppliers FOR DELETE
  USING (EXISTS (SELECT 1 FROM combinations JOIN beams ON beams.id = combinations.beam_id JOIN sarees ON sarees.id = beams.saree_id WHERE combinations.id = combination_suppliers.combination_id AND sarees.owner_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- STEP 7: Allow service_role to bypass RLS (already default)
-- The backend uses service_role key — it bypasses RLS policies
-- automatically. This is intentional: the backend enforces
-- ownership in application code for all mutations/reads.
-- ─────────────────────────────────────────────────────────────
-- No extra SQL needed — service_role always bypasses RLS.

-- ─────────────────────────────────────────────────────────────
-- DONE. Verify with:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- ─────────────────────────────────────────────────────────────
