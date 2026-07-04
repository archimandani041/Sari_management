/**
 * Supplier Controller
 * CRUD for suppliers + combination-supplier mapping
 */
const { supabase } = require('../config/supabase');

// ─── GET /api/suppliers ──────────────────────────────────────
const getSuppliers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;
    res.json({ suppliers: data || [] });
  } catch (error) {
    console.error('GetSuppliers error:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

// ─── GET /api/suppliers/:id ──────────────────────────────────
const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ supplier: data });
  } catch (error) {
    console.error('GetSupplierById error:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
};

// ─── POST /api/suppliers ──────────────────────────────────────
const createSupplier = async (req, res) => {
  try {
    const { name, company_name, mobile, email, address, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Supplier name is required' });
    if (!mobile?.trim()) return res.status(400).json({ error: 'Mobile number is required' });

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name: name.trim(),
        company_name: company_name?.trim() || null,
        mobile: mobile.trim(),
        email: email?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ supplier: data });
  } catch (error) {
    console.error('CreateSupplier error:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};

// ─── PUT /api/suppliers/:id ──────────────────────────────────
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company_name, mobile, email, address, notes, is_active } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (company_name !== undefined) updateData.company_name = company_name?.trim() || null;
    if (mobile !== undefined) updateData.mobile = mobile.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ supplier: data });
  } catch (error) {
    console.error('UpdateSupplier error:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
};

// ─── DELETE /api/suppliers/:id ──────────────────────────────
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('suppliers').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    res.json({ message: 'Supplier deactivated' });
  } catch (error) {
    console.error('DeleteSupplier error:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
};

// ─── GET /api/suppliers/combination/:comboId ─────────────────
// Get all suppliers linked to a combination
const getSuppliersByCombo = async (req, res) => {
  try {
    const { comboId } = req.params;
    const { data, error } = await supabase
      .from('combination_suppliers')
      .select('*, suppliers(*)')
      .eq('combination_id', comboId);
    if (error) throw error;
    const suppliers = (data || []).map(r => ({ ...r.suppliers, is_primary: r.is_primary, mapping_id: r.id }));
    res.json({ suppliers });
  } catch (error) {
    console.error('GetSuppliersByCombo error:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers for combination' });
  }
};

// ─── POST /api/suppliers/combination/:comboId ────────────────
// Link a supplier to a combination
const linkSupplierToCombo = async (req, res) => {
  try {
    const { comboId } = req.params;
    const { supplier_id, is_primary = false } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id is required' });

    const { data, error } = await supabase
      .from('combination_suppliers')
      .upsert({ combination_id: comboId, supplier_id, is_primary }, { onConflict: 'combination_id,supplier_id' })
      .select('*, suppliers(*)')
      .single();

    if (error) throw error;
    res.status(201).json({ mapping: data });
  } catch (error) {
    console.error('LinkSupplierToCombo error:', error);
    res.status(500).json({ error: 'Failed to link supplier' });
  }
};

// ─── DELETE /api/suppliers/combination/:comboId/:supplierId ──
const unlinkSupplierFromCombo = async (req, res) => {
  try {
    const { comboId, supplierId } = req.params;
    const { error } = await supabase
      .from('combination_suppliers')
      .delete()
      .eq('combination_id', comboId)
      .eq('supplier_id', supplierId);
    if (error) throw error;
    res.json({ message: 'Supplier unlinked' });
  } catch (error) {
    console.error('UnlinkSupplierFromCombo error:', error);
    res.status(500).json({ error: 'Failed to unlink supplier' });
  }
};

module.exports = {
  getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier,
  getSuppliersByCombo, linkSupplierToCombo, unlinkSupplierFromCombo
};
