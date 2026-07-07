/**
 * Stock Controller - V2 Hierarchical Model
 * Handles stock updates, history, and undo operations targeting combinations
 */
const { supabase } = require('../config/supabase');

const updateStock = async (req, res) => {
  try {
    const { 
      saree_id, combination_id, action, quantity, reason,
      action_detail, supplier_name, customer_name, invoice_number, delivery_notes, remarks
    } = req.body;
    
    if (!combination_id) return res.status(400).json({ error: 'Combination ID is required' });

    const { data: combo, error: fetchError } = await supabase
      .from('combinations')
      .select('*, beams(saree_id, beam_name, sarees(series_code))')
      .eq('id', combination_id)
      .single();

    if (fetchError || !combo) return res.status(404).json({ error: 'Combination not found' });

    let newStock;
    const oldStock = combo.current_stock;
    const qtyInt = parseInt(quantity) || 0;

    switch (action) {
      case 'Increase': newStock = oldStock + qtyInt; break;
      case 'Decrease':
        newStock = oldStock - qtyInt;
        if (newStock < 0) return res.status(400).json({ error: 'Stock cannot go below zero' });
        break;
      case 'Manual Edit':
        newStock = qtyInt;
        if (newStock < 0) return res.status(400).json({ error: 'Stock cannot be negative' });
        break;
      default: return res.status(400).json({ error: 'Invalid action' });
    }

    await supabase.from('combinations').update({
      current_stock: newStock, updated_at: new Date().toISOString()
    }).eq('id', combination_id);

    const quantityChanged = action === 'Manual Edit' ? newStock - oldStock : qtyInt;
    
    const transactionDetails = {
      sari_number: combo.beams?.sarees?.series_code || 'UNKNOWN',
      beam_name: combo.beams?.beam_name || 'UNKNOWN',
      combination_name: combo.combination_name || 'Combination',
      action: action_detail || (action === 'Increase' ? 'Stock Added' : action === 'Decrease' ? 'Delivery' : 'Manual Adjustment'),
      opening_stock: oldStock,
      quantity_changed: quantityChanged,
      closing_stock: newStock,
      reason_category: action_detail || action,
      supplier_name: supplier_name || null,
      customer_name: customer_name || null,
      invoice_number: invoice_number || null,
      delivery_notes: delivery_notes || null,
      remarks: remarks || reason || '',
      user_name: req.user.full_name || req.user.username
    };

    const { data: historyEntry } = await supabase.from('stock_history').insert({
      saree_id: combo.beams?.saree_id,
      combination_id,
      beam_name: combo.beams?.beam_name,
      combination_name: combo.combination_name || 'Combination',
      old_stock: oldStock,
      new_stock: newStock,
      action,
      reason: JSON.stringify(transactionDetails),
      changed_by: req.user.id,
      changed_by_name: req.user.full_name
    }).select().single();

    await supabase.from('activity_logs').insert({
      user_id: req.user.id,
      user_name: req.user.full_name,
      action: 'STOCK_UPDATE',
      entity_type: 'saree',
      entity_id: combo.beams?.saree_id,
      details: {
        beam_name: combo.beams?.beam_name,
        combination_name: combo.combination_name,
        old_stock: oldStock,
        new_stock: newStock,
        change_action: action,
        transaction_details: transactionDetails
      }
    });

    res.json({ message: 'Stock updated', old_stock: oldStock, new_stock: newStock, history_id: historyEntry?.id });
  } catch (error) {
    console.error('UpdateStock error:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
};

const undoStockChange = async (req, res) => {
  try {
    const { historyId } = req.params;
    const { data: entry } = await supabase
      .from('stock_history').select('*').eq('id', historyId).eq('is_undone', false).single();

    if (!entry) return res.status(404).json({ error: 'History entry not found or already undone' });
    if (!entry.combination_id) return res.status(400).json({ error: 'Cannot undo: combination no longer exists' });

    const { data: combo } = await supabase
      .from('combinations').select('current_stock').eq('id', entry.combination_id).single();

    if (!combo) return res.status(404).json({ error: 'Combination not found' });

    await supabase.from('combinations').update({
      current_stock: entry.old_stock, updated_at: new Date().toISOString()
    }).eq('id', entry.combination_id);

    await supabase.from('stock_history').update({ is_undone: true }).eq('id', historyId);

    await supabase.from('stock_history').insert({
      saree_id: entry.saree_id,
      combination_id: entry.combination_id,
      beam_name: entry.beam_name,
      combination_name: entry.combination_name,
      old_stock: combo.current_stock,
      new_stock: entry.old_stock,
      action: 'Undo',
      reason: `Undo: ${entry.action}`,
      changed_by: req.user.id,
      changed_by_name: req.user.full_name
    });

    res.json({ message: 'Stock change undone', reverted_to: entry.old_stock });
  } catch (error) {
    console.error('UndoStock error:', error);
    res.status(500).json({ error: 'Failed to undo stock change' });
  }
};

const getHistory = async (req, res) => {
  try {
    const { 
      saree_id, page = 1, limit = 50, action, from_date, to_date, search,
      supplier_name, customer_name, reason_category, user_name
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    let query = supabase.from('stock_history')
      .select('*, sarees(sari_name, series_code, image_url)', { count: 'exact' });

    if (saree_id) {
      query = query.eq('saree_id', saree_id);
    }
    if (action) {
      query = query.eq('action', action);
    }
    if (from_date) {
      query = query.gte('created_at', from_date);
    }
    if (to_date) {
      query = query.lte('created_at', to_date);
    }

    // Apply text filters
    if (search) {
      const cleanSearch = search.trim();
      
      // 1. Fetch matching Saree IDs (case-insensitive series_code or sari_name)
      const { data: matchedSarees } = await supabase
        .from('sarees')
        .select('id')
        .or(`series_code.ilike.%${cleanSearch}%,sari_name.ilike.%${cleanSearch}%`);
      
      const matchedSareeIds = (matchedSarees || []).map(s => s.id);

      // 2. Build multi-field PostgREST OR conditions
      const orParts = [
        `beam_name.ilike.%${cleanSearch}%`,
        `combination_name.ilike.%${cleanSearch}%`,
        `changed_by_name.ilike.%${cleanSearch}%`,
        `reason.ilike.%${cleanSearch}%`
      ];

      if (matchedSareeIds.length > 0) {
        orParts.push(`saree_id.in.(${matchedSareeIds.join(',')})`);
      }

      query = query.or(orParts.join(','));
    }
    if (supplier_name) {
      query = query.ilike('reason', `%supplier_name%:${supplier_name}%`);
    }
    if (customer_name) {
      query = query.ilike('reason', `%customer_name%:${customer_name}%`);
    }
    if (reason_category) {
      query = query.ilike('reason', `%reason_category%:${reason_category}%`);
    }
    if (user_name) {
      query = query.or(`changed_by_name.ilike.%${user_name}%,reason.ilike.%user_name%:${user_name}%`);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limitVal - 1);

    const { data: history, error, count } = await query;
    if (error) throw error;

    const formattedHistory = (history || []).map(entry => {
      let details = null;
      try {
        if (entry.reason && (entry.reason.startsWith('{') || entry.reason.startsWith('['))) {
          details = JSON.parse(entry.reason);
        }
      } catch (e) {
        // ignore
      }

      if (!details) {
        const qtyChanged = entry.new_stock - entry.old_stock;
        details = {
          sari_number: entry.sarees?.series_code || entry.series_code || 'UNKNOWN',
          beam_name: entry.beam_name || 'UNKNOWN',
          combination_name: entry.combination_name || 'Combination',
          action: entry.action === 'Increase' ? 'Stock Added' : entry.action === 'Decrease' ? 'Delivery' : 'Manual Edit',
          opening_stock: entry.old_stock,
          quantity_changed: qtyChanged,
          closing_stock: entry.new_stock,
          reason_category: entry.action,
          supplier_name: null,
          customer_name: null,
          invoice_number: null,
          delivery_notes: null,
          remarks: entry.reason || '',
          user_name: entry.changed_by_name || 'System'
        };
      }

      return {
        ...entry,
        details
      };
    });

    res.json({
      history: formattedHistory,
      pagination: { 
        page: parseInt(page), 
        limit: limitVal, 
        total: count, 
        totalPages: Math.ceil(count / limitVal) 
      }
    });
  } catch (error) {
    console.error('GetHistory error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

module.exports = { updateStock, undoStockChange, getHistory };
