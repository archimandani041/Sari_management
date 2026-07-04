/**
 * Settings Controller
 */
const { supabase } = require('../config/supabase');

const getSettings = async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
    if (error) throw error;
    res.json({ settings: data });
  } catch (error) {
    console.error('GetSettings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { company_name, logo_url, theme, default_minimum_stock } = req.body;
    const { data: existing } = await supabase.from('settings').select('id').limit(1).maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Settings not found' });

    const updateData = { updated_at: new Date().toISOString() };
    if (company_name !== undefined) updateData.company_name = company_name;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (theme !== undefined) updateData.theme = theme;
    if (default_minimum_stock !== undefined) updateData.default_minimum_stock = parseInt(default_minimum_stock);

    const { data, error } = await supabase.from('settings').update(updateData).eq('id', existing.id).select().single();
    if (error) throw error;

    res.json({ settings: data });
  } catch (error) {
    console.error('UpdateSettings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

module.exports = { getSettings, updateSettings };
