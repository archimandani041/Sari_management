-- ============================================================
-- SUPPLIER & STOCK REQUEST MODULE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- 2. COMBINATION ↔ SUPPLIER MAPPING (many-to-many)
CREATE TABLE IF NOT EXISTS combination_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combination_id UUID NOT NULL REFERENCES combinations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(combination_id, supplier_id)
);

-- 3. STOCK REQUESTS (purchase request history)
CREATE TABLE IF NOT EXISTS stock_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saree_id UUID REFERENCES sarees(id) ON DELETE SET NULL,
    combination_id UUID REFERENCES combinations(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    beam_name VARCHAR(255),
    combination_name VARCHAR(255),
    series_code VARCHAR(25),
    requested_qty INTEGER NOT NULL DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 20,
    whatsapp_message TEXT,
    status VARCHAR(20) DEFAULT 'Requested' CHECK (status IN ('Requested', 'Confirmed', 'Received', 'Cancelled')),
    notes TEXT,
    requested_by UUID REFERENCES users(id),
    requested_by_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_suppliers_mobile ON suppliers(mobile);
CREATE INDEX IF NOT EXISTS idx_combo_suppliers_combo ON combination_suppliers(combination_id);
CREATE INDEX IF NOT EXISTS idx_combo_suppliers_supplier ON combination_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_saree ON stock_requests(saree_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_status ON stock_requests(status);
CREATE INDEX IF NOT EXISTS idx_stock_requests_date ON stock_requests(created_at);
