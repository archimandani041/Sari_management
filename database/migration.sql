-- ==============================================================
-- CLEAN MIGRATION SCRIPT FOR SUPABASE SQL EDITOR
-- Copy and paste this ENTIRE file into the SQL Editor and click RUN
-- WARNING: This will reset existing saree data to start fresh.
-- ==============================================================

-- 1. DROP OLD TABLES AND TYPES
DROP TABLE IF EXISTS combination_colors CASCADE;
DROP TABLE IF EXISTS color_variants CASCADE;
DROP TABLE IF EXISTS stock_history CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS combinations CASCADE;
DROP TABLE IF EXISTS beams CASCADE;
DROP TABLE IF EXISTS sarees CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE SAREES TABLE
CREATE TABLE sarees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_base VARCHAR(20) NOT NULL,
    series_letter VARCHAR(5) NOT NULL DEFAULT 'A',
    series_code VARCHAR(25) GENERATED ALWAYS AS (series_base || series_letter) STORED,
    sari_name VARCHAR(255),
    description TEXT,
    price DECIMAL(10, 2) DEFAULT NULL,
    image_url TEXT,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(series_base, series_letter)
);

-- 4. CREATE BEAMS TABLE
CREATE TABLE beams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saree_id UUID NOT NULL REFERENCES sarees(id) ON DELETE CASCADE,
    beam_name VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE COMBINATIONS TABLE
CREATE TABLE combinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beam_id UUID NOT NULL REFERENCES beams(id) ON DELETE CASCADE,
    combination_name VARCHAR(255),
    current_stock INTEGER DEFAULT 0 CHECK (current_stock >= 0),
    minimum_stock INTEGER DEFAULT 20,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CREATE COMBINATION COLORS TABLE
CREATE TABLE combination_colors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combination_id UUID NOT NULL REFERENCES combinations(id) ON DELETE CASCADE,
    f_number VARCHAR(10) NOT NULL,
    color_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CREATE STOCK HISTORY TABLE
CREATE TABLE stock_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saree_id UUID REFERENCES sarees(id) ON DELETE CASCADE,
    combination_id UUID REFERENCES combinations(id) ON DELETE SET NULL,
    beam_name VARCHAR(255),
    combination_name VARCHAR(255),
    old_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    action VARCHAR(30) NOT NULL CHECK (action IN ('Increase', 'Decrease', 'Manual Edit', 'Undo')),
    reason TEXT,
    changed_by UUID REFERENCES users(id),
    changed_by_name VARCHAR(100),
    is_undone BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CREATE ACTIVITY LOGS TABLE
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CREATE SETTINGS TABLE
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) DEFAULT 'Sari Stock Manager',
    logo_url TEXT,
    theme VARCHAR(20) DEFAULT 'light',
    default_minimum_stock INTEGER DEFAULT 20,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CREATE INDEXES
CREATE INDEX idx_sarees_series ON sarees(series_code);
CREATE INDEX idx_sarees_base ON sarees(series_base);
CREATE INDEX idx_beams_saree ON beams(saree_id);
CREATE INDEX idx_combinations_beam ON combinations(beam_id);
CREATE INDEX idx_colors_combination ON combination_colors(combination_id);
CREATE INDEX idx_history_saree ON stock_history(saree_id);
CREATE INDEX idx_history_combination ON stock_history(combination_id);
CREATE INDEX idx_history_date ON stock_history(created_at);
CREATE INDEX idx_activity_date ON activity_logs(created_at);

-- 11. INSERT SEED DATA
INSERT INTO settings (company_name, theme, default_minimum_stock)
VALUES ('Sari Stock Manager', 'light', 20)
ON CONFLICT DO NOTHING;

-- Admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, full_name)
VALUES ('admin', 'admin@saristockmanager.com', '$2b$10$r88eetBZ90h4/yRmGGNw8ecrow8s/aSTjirpSA1biz96n3ZkvLFJy', 'admin', 'Administrator')
ON CONFLICT (username) DO NOTHING;

-- Staff user (password: staff123)
INSERT INTO users (username, email, password_hash, role, full_name)
VALUES ('staff', 'staff@saristockmanager.com', '$2b$10$x3rorH62Km7A23.X65Hhk.x.0gCxvTct7u7Fb6h1CU.b.qNlIV5Na', 'staff', 'Staff User')
ON CONFLICT (username) DO NOTHING;
