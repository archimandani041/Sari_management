-- ============================================================
-- KP Creation — Complete Multi-Tenant Data Isolation Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Alter tables to add owner_id if not exists
ALTER TABLE sarees ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE beams ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE combinations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE combination_colors ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE combination_suppliers ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE stock_history ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill owner_id for existing records (only if the user still exists in auth.users)
UPDATE sarees SET owner_id = created_by WHERE owner_id IS NULL AND created_by IN (SELECT id FROM auth.users);
UPDATE suppliers SET owner_id = created_by WHERE owner_id IS NULL AND created_by IN (SELECT id FROM auth.users);
UPDATE stock_history SET owner_id = changed_by WHERE owner_id IS NULL AND changed_by IN (SELECT id FROM auth.users);
UPDATE stock_requests SET owner_id = requested_by WHERE owner_id IS NULL AND requested_by IN (SELECT id FROM auth.users);

-- Backfill hierarchy
UPDATE beams b SET owner_id = s.owner_id FROM sarees s WHERE b.saree_id = s.id AND b.owner_id IS NULL;
UPDATE combinations c SET owner_id = b.owner_id FROM beams b WHERE c.beam_id = b.id AND c.owner_id IS NULL;
UPDATE combination_colors cc SET owner_id = c.owner_id FROM combinations c WHERE cc.combination_id = c.id AND cc.owner_id IS NULL;
UPDATE combination_suppliers cs SET owner_id = c.owner_id FROM combinations c WHERE cs.combination_id = c.id AND cs.owner_id IS NULL;
UPDATE activity_logs SET owner_id = user_id WHERE owner_id IS NULL AND user_id IN (SELECT id FROM auth.users);

-- 3. Uniqueness constraint for series_code: unique per owner
ALTER TABLE sarees DROP CONSTRAINT IF EXISTS sarees_series_base_series_letter_key;
ALTER TABLE sarees DROP CONSTRAINT IF EXISTS sarees_series_owner_unique;
ALTER TABLE sarees ADD CONSTRAINT sarees_series_owner_unique UNIQUE (series_base, series_letter, owner_id);

-- 4. Enable RLS on all tables
ALTER TABLE sarees ENABLE ROW LEVEL SECURITY;
ALTER TABLE beams ENABLE ROW LEVEL SECURITY;
ALTER TABLE combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE combination_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE combination_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. Policies for sarees
DROP POLICY IF EXISTS "sarees_owner_select" ON sarees;
DROP POLICY IF EXISTS "sarees_owner_insert" ON sarees;
DROP POLICY IF EXISTS "sarees_owner_update" ON sarees;
DROP POLICY IF EXISTS "sarees_owner_delete" ON sarees;
CREATE POLICY "sarees_owner_select" ON sarees FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "sarees_owner_insert" ON sarees FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "sarees_owner_update" ON sarees FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "sarees_owner_delete" ON sarees FOR DELETE USING (auth.uid() = owner_id);

-- Policies for beams
DROP POLICY IF EXISTS "beams_owner_select" ON beams;
DROP POLICY IF EXISTS "beams_owner_insert" ON beams;
DROP POLICY IF EXISTS "beams_owner_update" ON beams;
DROP POLICY IF EXISTS "beams_owner_delete" ON beams;
CREATE POLICY "beams_owner_select" ON beams FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "beams_owner_insert" ON beams FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "beams_owner_update" ON beams FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "beams_owner_delete" ON beams FOR DELETE USING (auth.uid() = owner_id);

-- Policies for combinations
DROP POLICY IF EXISTS "combinations_owner_select" ON combinations;
DROP POLICY IF EXISTS "combinations_owner_insert" ON combinations;
DROP POLICY IF EXISTS "combinations_owner_update" ON combinations;
DROP POLICY IF EXISTS "combinations_owner_delete" ON combinations;
CREATE POLICY "combinations_owner_select" ON combinations FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "combinations_owner_insert" ON combinations FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "combinations_owner_update" ON combinations FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "combinations_owner_delete" ON combinations FOR DELETE USING (auth.uid() = owner_id);

-- Policies for combination_colors
DROP POLICY IF EXISTS "combo_colors_owner_select" ON combination_colors;
DROP POLICY IF EXISTS "combo_colors_owner_insert" ON combination_colors;
DROP POLICY IF EXISTS "combo_colors_owner_update" ON combination_colors;
DROP POLICY IF EXISTS "combo_colors_owner_delete" ON combination_colors;
CREATE POLICY "combo_colors_owner_select" ON combination_colors FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "combo_colors_owner_insert" ON combination_colors FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "combo_colors_owner_update" ON combination_colors FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "combo_colors_owner_delete" ON combination_colors FOR DELETE USING (auth.uid() = owner_id);

-- Policies for combination_suppliers
DROP POLICY IF EXISTS "combo_suppliers_owner_select" ON combination_suppliers;
DROP POLICY IF EXISTS "combo_suppliers_owner_insert" ON combination_suppliers;
DROP POLICY IF EXISTS "combo_suppliers_owner_update" ON combination_suppliers;
DROP POLICY IF EXISTS "combo_suppliers_owner_delete" ON combination_suppliers;
CREATE POLICY "combo_suppliers_owner_select" ON combination_suppliers FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "combo_suppliers_owner_insert" ON combination_suppliers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "combo_suppliers_owner_update" ON combination_suppliers FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "combo_suppliers_owner_delete" ON combination_suppliers FOR DELETE USING (auth.uid() = owner_id);

-- Policies for suppliers
DROP POLICY IF EXISTS "suppliers_owner_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_owner_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_owner_update" ON suppliers;
DROP POLICY IF EXISTS "suppliers_owner_delete" ON suppliers;
CREATE POLICY "suppliers_owner_select" ON suppliers FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "suppliers_owner_insert" ON suppliers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "suppliers_owner_update" ON suppliers FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "suppliers_owner_delete" ON suppliers FOR DELETE USING (auth.uid() = owner_id);

-- Policies for stock_requests
DROP POLICY IF EXISTS "stock_requests_owner_select" ON stock_requests;
DROP POLICY IF EXISTS "stock_requests_owner_insert" ON stock_requests;
DROP POLICY IF EXISTS "stock_requests_owner_update" ON stock_requests;
DROP POLICY IF EXISTS "stock_requests_owner_delete" ON stock_requests;
CREATE POLICY "stock_requests_owner_select" ON stock_requests FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "stock_requests_owner_insert" ON stock_requests FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "stock_requests_owner_update" ON stock_requests FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "stock_requests_owner_delete" ON stock_requests FOR DELETE USING (auth.uid() = owner_id);

-- Policies for stock_history
DROP POLICY IF EXISTS "stock_history_owner_select" ON stock_history;
DROP POLICY IF EXISTS "stock_history_owner_insert" ON stock_history;
DROP POLICY IF EXISTS "stock_history_owner_update" ON stock_history;
DROP POLICY IF EXISTS "stock_history_owner_delete" ON stock_history;
CREATE POLICY "stock_history_owner_select" ON stock_history FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "stock_history_owner_insert" ON stock_history FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "stock_history_owner_update" ON stock_history FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "stock_history_owner_delete" ON stock_history FOR DELETE USING (auth.uid() = owner_id);

-- Policies for settings
DROP POLICY IF EXISTS "settings_owner_select" ON settings;
DROP POLICY IF EXISTS "settings_owner_insert" ON settings;
DROP POLICY IF EXISTS "settings_owner_update" ON settings;
DROP POLICY IF EXISTS "settings_owner_delete" ON settings;
CREATE POLICY "settings_owner_select" ON settings FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "settings_owner_insert" ON settings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "settings_owner_update" ON settings FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "settings_owner_delete" ON settings FOR DELETE USING (auth.uid() = owner_id);

-- Policies for activity_logs
DROP POLICY IF EXISTS "activity_logs_owner_select" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_owner_insert" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_owner_update" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_owner_delete" ON activity_logs;
CREATE POLICY "activity_logs_owner_select" ON activity_logs FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "activity_logs_owner_insert" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "activity_logs_owner_update" ON activity_logs FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "activity_logs_owner_delete" ON activity_logs FOR DELETE USING (auth.uid() = owner_id);
