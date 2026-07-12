-- =============================================================================
-- MIGRATION: Add owner_id to public.users
-- Purpose: Allow staff accounts to be associated with an owner/admin account.
--          This enables staff to see and operate on their owner's inventory data.
--
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

-- Step 1: Add owner_id column to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: For existing admin/owner accounts → their owner_id = their own id
--         For existing staff accounts → leave owner_id NULL until admin assigns them
-- Update the main data-owning account (mandaniarchi) to point to itself
UPDATE public.users
  SET owner_id = id
  WHERE role = 'admin' OR id IN (
    -- Set owner_id = self for any user who owns sarees
    SELECT DISTINCT owner_id FROM sarees
  );

-- Step 3: For the mandaniarchi account specifically (the one that owns sarees),
--         set their owner_id to their own ID
UPDATE public.users
  SET owner_id = '4bb87b26-cdfa-485f-93b9-97deaa0facbf'
  WHERE id = '4bb87b26-cdfa-485f-93b9-97deaa0facbf';

-- Step 4: For all staff accounts that have NO owner_id yet,
--         assign them to the first account that has sarees (mandaniarchi)
-- This assumes a single-tenant setup where all staff belong to one owner
UPDATE public.users
  SET owner_id = '4bb87b26-cdfa-485f-93b9-97deaa0facbf'
  WHERE owner_id IS NULL;

-- Step 5: Verify
SELECT id, username, role, owner_id FROM public.users ORDER BY created_at;
