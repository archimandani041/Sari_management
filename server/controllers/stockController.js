/**
 * Stock Controller - V3 ERP Stock Actions Model
 * Supports:
 *  - Stock (New stock received, +qty)
 *  - Delivery (Sent to machine for production, 0 stock change)
 *  - Stock Delivery (Delivered from existing stock, -qty with stock check validation)
 *  - Future Actions: Return, Damage, Transfer, Adjustment, Sample, Manual Edit
 */
const { supabase } = require('../config/supabase');

const updateStock = async (req, res) => {
  try {
    const { 
      saree_id, combination_id, action, quantity, reason,
      action_detail, supplier_name, customer_name, machine, operator_name, invoice_number, remarks
    } = req.body;
    
    if (!combination_id) return res.status(400).json({ error: 'Combination ID is required' });

    // 1. Fetch current combination state
    const { data: combo, error: fetchError } = await supabase
      .from('combinations')
      .select('*, beams(saree_id, beam_name, sarees(series_code, owner_id))')
      .eq('id', combination_id)
      .eq('owner_id', req.user.owner_id)
      .single();

    if (fetchError || !combo) return res.status(404).json({ error: 'Combination not found' });

    const oldStock = combo.current_stock ?? 0;
    const qtyInt = Math.abs(parseInt(quantity) || 0);
    const actionNormalized = (action || '').trim();

    let newStock = oldStock;
    let netQuantityChange = 0;
    let computedReason = reason || '';

    // 2. Action Logic
    switch (actionNormalized) {
      case 'Stock':
      case 'Increase':
        newStock = oldStock + qtyInt;
        netQuantityChange = qtyInt;
        computedReason = computedReason || 'Purchase / WhatsApp / Manual';
        break;

      case 'Delivery':
        // Machine Delivery — inventory must NOT change (0 deduction)
        newStock = oldStock;
        netQuantityChange = qtyInt; // tracked quantity, but stock change is 0
        computedReason = computedReason || 'Machine Delivery';
        break;

      case 'Stock Delivery':
      case 'Decrease':
        // Validation: Cannot deliver more than current available stock
        if (qtyInt > oldStock) {
          return res.status(400).json({ 
            error: `Only ${oldStock} pieces are available in stock.` 
          });
        }
        newStock = oldStock - qtyInt;
        netQuantityChange = -qtyInt;
        computedReason = computedReason || 'Stock Delivered';
        break;

      case 'Return':
        newStock = oldStock + qtyInt;
        netQuantityChange = qtyInt;
        computedReason = computedReason || 'Return to Stock';
        break;

      case 'Damage':
        if (qtyInt > oldStock) {
          return res.status(400).json({ error: `Only ${oldStock} pieces are available in stock.` });
        }
        newStock = oldStock - qtyInt;
        netQuantityChange = -qtyInt;
        computedReason = computedReason || 'Damaged Stock';
        break;

      case 'Transfer':
        if (qtyInt > oldStock) {
          return res.status(400).json({ error: `Only ${oldStock} pieces are available in stock.` });
        }
        newStock = oldStock - qtyInt;
        netQuantityChange = -qtyInt;
        computedReason = computedReason || 'Stock Transfer';
        break;

      case 'Sample':
        if (qtyInt > oldStock) {
          return res.status(400).json({ error: `Only ${oldStock} pieces are available in stock.` });
        }
        newStock = oldStock - qtyInt;
        netQuantityChange = -qtyInt;
        computedReason = computedReason || 'Sample Issued';
        break;

      case 'Adjustment':
      case 'Manual Edit':
        newStock = parseInt(quantity) || 0;
        if (newStock < 0) return res.status(400).json({ error: 'Stock cannot be negative' });
        netQuantityChange = newStock - oldStock;
        computedReason = computedReason || 'Manual Adjustment';
        break;

      default:
        return res.status(400).json({ error: `Invalid action '${action}'` });
    }

    // 3. Update stock in DB if stock changed
    if (newStock !== oldStock) {
      const { error: updateErr } = await supabase
        .from('combinations')
        .update({
          current_stock: newStock, 
          updated_at: new Date().toISOString()
        })
        .eq('id', combination_id)
        .eq('owner_id', req.user.owner_id);

      if (updateErr) throw updateErr;
    }

    // 4. Build detailed record for history & reports
    const sariNumber = combo.beams?.sarees?.series_code || 'UNKNOWN';
    const beamName = combo.beams?.beam_name || 'UNKNOWN';
    const combinationName = combo.combination_name || 'Combination';

    const transactionDetails = {
      sari_number: sariNumber,
      beam_name: beamName,
      combination_name: combinationName,
      action: actionNormalized,
      opening_stock: oldStock,
      quantity: qtyInt,
      quantity_changed: netQuantityChange,
      closing_stock: newStock,
      reason: computedReason,
      supplier_name: supplier_name || null,
      customer_name: customer_name || null,
      machine: machine || null,
      operator_name: operator_name || null,
      invoice_number: invoice_number || null,
      remarks: remarks || computedReason,
      user_name: req.user.full_name || req.user.username
    };

    // 5. Insert history entry (writing to both explicit columns and JSON reason for maximum safety)
    const historyPayload = {
      saree_id: combo.beams?.saree_id,
      combination_id,
      beam_name: beamName,
      combination_name: combinationName,
      old_stock: oldStock,
      new_stock: newStock,
      action: actionNormalized,
      reason: JSON.stringify(transactionDetails),
      owner_id: req.user.owner_id,
      changed_by: req.user.id,
      changed_by_name: req.user.full_name || req.user.username,
      quantity: qtyInt,
      supplier_name: supplier_name || null,
      customer_name: customer_name || null,
      machine: machine || null,
      operator_name: operator_name || null,
      invoice_number: invoice_number || null,
      remarks: remarks || computedReason
    };

    const { data: historyEntry, error: histErr } = await supabase
      .from('stock_history')
      .insert(historyPayload)
      .select()
      .single();

    if (histErr) {
      console.warn('stock_history insert warning (retrying without new columns):', histErr.message);
      // Fallback if DB hasn't run the migration for columns yet
      delete historyPayload.quantity;
      delete historyPayload.supplier_name;
      delete historyPayload.customer_name;
      delete historyPayload.machine;
      delete historyPayload.operator_name;
      delete historyPayload.invoice_number;
      delete historyPayload.remarks;
      await supabase.from('stock_history').insert(historyPayload);
    }

    // 6. Log activity
    await supabase.from('activity_logs').insert({
      user_id: req.user.id,
      user_name: req.user.full_name || req.user.username,
      action: 'STOCK_UPDATE',
      entity_type: 'saree',
      entity_id: combo.beams?.saree_id,
      owner_id: req.user.owner_id,
      details: transactionDetails
    });

    res.json({ 
      message: 'Stock action recorded successfully', 
      action: actionNormalized,
      old_stock: oldStock, 
      new_stock: newStock, 
      history_id: historyEntry?.id,
      details: transactionDetails 
    });
  } catch (error) {
    console.error('UpdateStock error:', error);
    res.status(500).json({ error: error.message || 'Failed to process stock action' });
  }
};

const undoStockChange = async (req, res) => {
  try {
    const { historyId } = req.params;
    const { data: entry } = await supabase
      .from('stock_history')
      .select('*')
      .eq('id', historyId)
      .eq('owner_id', req.user.owner_id)
      .eq('is_undone', false)
      .single();

    if (!entry) return res.status(404).json({ error: 'History entry not found or already undone' });
    if (!entry.combination_id) return res.status(400).json({ error: 'Cannot undo: combination no longer exists' });

    const { data: combo } = await supabase
      .from('combinations')
      .select('current_stock')
      .eq('id', entry.combination_id)
      .eq('owner_id', req.user.owner_id)
      .single();

    if (!combo) return res.status(404).json({ error: 'Combination not found' });

    // Revert stock to old_stock
    await supabase.from('combinations').update({
      current_stock: entry.old_stock, updated_at: new Date().toISOString()
    }).eq('id', entry.combination_id).eq('owner_id', req.user.owner_id);

    await supabase.from('stock_history').update({ is_undone: true }).eq('id', historyId).eq('owner_id', req.user.owner_id);

    await supabase.from('stock_history').insert({
      saree_id: entry.saree_id,
      combination_id: entry.combination_id,
      beam_name: entry.beam_name,
      combination_name: entry.combination_name,
      old_stock: combo.current_stock,
      new_stock: entry.old_stock,
      action: 'Undo',
      reason: `Undo: ${entry.action}`,
      owner_id: req.user.owner_id,
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
      saree_id, page = 1, limit = 50, action, date_range, from_date, to_date, search,
      supplier_name, customer_name, machine, user_name
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    let query = supabase.from('stock_history')
      .select('*, sarees(sari_name, series_code, image_url)', { count: 'exact' })
      .eq('owner_id', req.user.owner_id);

    if (saree_id) {
      query = query.eq('saree_id', saree_id);
    }
    if (action) {
      query = query.eq('action', action);
    }

    // Date filtering
    if (from_date) {
      query = query.gte('created_at', from_date);
    }
    if (to_date) {
      query = query.lte('created_at', to_date);
    }
    if (date_range === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query = query.gte('created_at', todayStart.toISOString());
    } else if (date_range === 'monthly') {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      query = query.gte('created_at', monthStart.toISOString());
    }

    // Search filters
    if (search) {
      const cleanSearch = search.trim();
      const { data: matchedSarees } = await supabase
        .from('sarees')
        .select('id')
        .eq('owner_id', req.user.owner_id)
        .or(`series_code.ilike.%${cleanSearch}%,sari_name.ilike.%${cleanSearch}%`);
      
      const matchedSareeIds = (matchedSarees || []).map(s => s.id);

      const orParts = [
        `beam_name.ilike.%${cleanSearch}%`,
        `combination_name.ilike.%${cleanSearch}%`,
        `changed_by_name.ilike.%${cleanSearch}%`,
        `reason.ilike.%${cleanSearch}%`,
        `action.ilike.%${cleanSearch}%`
      ];

      if (matchedSareeIds.length > 0) {
        orParts.push(`saree_id.in.(${matchedSareeIds.join(',')})`);
      }

      query = query.or(orParts.join(','));
    }

    if (supplier_name) {
      query = query.or(`supplier_name.ilike.%${supplier_name}%,reason.ilike.%supplier_name%:${supplier_name}%`);
    }
    if (customer_name) {
      query = query.or(`customer_name.ilike.%${customer_name}%,reason.ilike.%customer_name%:${customer_name}%`);
    }
    if (machine) {
      query = query.or(`machine.ilike.%${machine}%,reason.ilike.%machine%:${machine}%`);
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
      } catch (e) {}

      if (!details) {
        details = {
          sari_number: entry.sarees?.series_code || entry.series_code || 'UNKNOWN',
          beam_name: entry.beam_name || 'UNKNOWN',
          combination_name: entry.combination_name || 'Combination',
          action: entry.action,
          opening_stock: entry.old_stock,
          quantity: entry.quantity || Math.abs(entry.new_stock - entry.old_stock),
          quantity_changed: entry.new_stock - entry.old_stock,
          closing_stock: entry.new_stock,
          reason: entry.remarks || entry.reason || '',
          supplier_name: entry.supplier_name || null,
          customer_name: entry.customer_name || null,
          machine: entry.machine || null,
          operator_name: entry.operator_name || null,
          invoice_number: entry.invoice_number || null,
          remarks: entry.remarks || entry.reason || '',
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
