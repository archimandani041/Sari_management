/**
 * Settings Controller
 */
const { supabase } = require('../config/supabase');

const getSettings = async (req, res) => {
  try {
    let { data, error } = await supabase.from('settings').select('*').eq('owner_id', req.user.owner_id).maybeSingle();
    if (error) throw error;

    if (!data) {
      const { data: created, error: createError } = await supabase
        .from('settings')
        .insert({
          owner_id: req.user.owner_id,
          company_name: 'Sari Stock Manager',
          theme: 'light',
          default_minimum_stock: 20
        })
        .select()
        .single();
      if (createError) throw createError;
      data = created;
    }

    res.json({ settings: data });
  } catch (error) {
    console.error('GetSettings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { company_name, logo_url, theme, default_minimum_stock } = req.body;
    let { data: existing } = await supabase.from('settings').select('id').eq('owner_id', req.user.owner_id).maybeSingle();

    const updateData = { updated_at: new Date().toISOString() };
    if (company_name !== undefined) updateData.company_name = company_name;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (theme !== undefined) updateData.theme = theme;
    if (default_minimum_stock !== undefined) updateData.default_minimum_stock = parseInt(default_minimum_stock);

    let resultData;
    if (!existing) {
      const insertData = {
        ...updateData,
        owner_id: req.user.owner_id,
        company_name: company_name || 'Sari Stock Manager',
        theme: theme || 'light',
        default_minimum_stock: default_minimum_stock !== undefined ? parseInt(default_minimum_stock) : 20
      };
      const { data: created, error: createError } = await supabase.from('settings').insert(insertData).select().single();
      if (createError) throw createError;
      resultData = created;
    } else {
      const { data, error: updateError } = await supabase.from('settings').update(updateData).eq('id', existing.id).eq('owner_id', req.user.owner_id).select().single();
      if (updateError) throw updateError;
      resultData = data;
    }

    res.json({ settings: resultData });
  } catch (error) {
    console.error('UpdateSettings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

module.exports = { getSettings, updateSettings };

