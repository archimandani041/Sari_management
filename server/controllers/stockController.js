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
      .select('*, beams(saree_id, beam_name, sarees(series_code, owner_id))')
      .eq('id', combination_id)
      .eq('owner_id', req.user.owner_id)
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
    }).eq('id', combination_id).eq('owner_id', req.user.owner_id);

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
      owner_id: req.user.owner_id,
      changed_by: req.user.id,
      changed_by_name: req.user.full_name
    }).select().single();

    await supabase.from('activity_logs').insert({
      user_id: req.user.id,
      user_name: req.user.full_name,
      action: 'STOCK_UPDATE',
      entity_type: 'saree',
      entity_id: combo.beams?.saree_id,
      owner_id: req.user.owner_id,
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
      .from('stock_history').select('*').eq('id', historyId).eq('owner_id', req.user.owner_id).eq('is_undone', false).single();

    if (!entry) return res.status(404).json({ error: 'History entry not found or already undone' });
    if (!entry.combination_id) return res.status(400).json({ error: 'Cannot undo: combination no longer exists' });

    const { data: combo } = await supabase
      .from('combinations').select('current_stock').eq('id', entry.combination_id).eq('owner_id', req.user.owner_id).single();

    if (!combo) return res.status(404).json({ error: 'Combination not found' });

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

const rollbackStockChange = async (req, res) => {
  try {
    const { historyId } = req.params;
    const rollbackReasonInput = (req.body.reason || 'History Deleted / Admin Rollback').trim();

    // 1. Admin restriction
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can rollback transactions.' });
    }

    // 2. Find target history record
    const { data: entry, error: fetchErr } = await supabase
      .from('stock_history')
      .select('*, sarees(sari_name, series_code)')
      .eq('id', historyId)
      .eq('owner_id', req.user.owner_id)
      .single();

    if (fetchErr || !entry) {
      return res.status(404).json({ error: 'History transaction not found' });
    }

    let details = {};
    try {
      if (entry.reason && (entry.reason.startsWith('{') || entry.reason.startsWith('['))) {
        details = JSON.parse(entry.reason);
      }
    } catch (_) {}

    // 3. Prevent duplicate rollbacks
    if (entry.is_undone || details.is_rolled_back) {
      return res.status(400).json({ error: 'This transaction has already been rolled back.' });
    }

    if (!entry.combination_id) {
      return res.status(400).json({ error: 'Target combination no longer exists in inventory.' });
    }

    // 4. Fetch combination stock
    const { data: combo, error: comboErr } = await supabase
      .from('combinations')
      .select('current_stock, combination_name, owner_id, beams(beam_name, saree_id, sarees(series_code))')
      .eq('id', entry.combination_id)
      .single();

    if (comboErr || !combo) {
      return res.status(404).json({ error: 'Combination not found' });
    }

    if (combo.owner_id && combo.owner_id !== req.user.owner_id) {
      return res.status(403).json({ error: 'Unauthorized to modify this combination.' });
    }

    const currentStock = combo.current_stock;
    let delta = 0;

    // Calculate delta to reverse:
    // Stock / Increase (+Q) -> Rollback subtracts Q (-Q)
    // Stock Delivery / Decrease (-Q) -> Rollback adds Q (+Q)
    // Delivery (Machine) (0 change) -> Rollback 0 change
    // Manual Edit / Correction -> Reverse difference (old_stock - new_stock)
    const act = (entry.action || '').toUpperCase();
    if (act === 'STOCK' || act === 'INCREASE' || act === 'STOCK IN') {
      const qty = Math.abs(entry.new_stock - entry.old_stock) || Math.abs(details.quantity_changed || 0);
      delta = -qty;
    } else if (act === 'STOCK DELIVERY' || act === 'DECREASE' || act === 'DELIVERY OUT') {
      const qty = Math.abs(entry.old_stock - entry.new_stock) || Math.abs(details.quantity_changed || 0);
      delta = +qty;
    } else if (act === 'DELIVERY') {
      delta = 0;
    } else {
      delta = entry.old_stock - entry.new_stock;
    }

    const newStock = currentStock + delta;
    if (newStock < 0) {
      return res.status(400).json({ error: `Rollback cancelled: stock cannot go below 0 (would become ${newStock} pcs).` });
    }

    const rollbackDate = new Date().toISOString();

    // 5. Update combination current stock
    const { error: updateComboErr } = await supabase
      .from('combinations')
      .update({ current_stock: newStock, owner_id: req.user.owner_id, updated_at: rollbackDate })
      .eq('id', entry.combination_id);

    if (updateComboErr) throw updateComboErr;

    // 6. Insert Rollback entry into stock_history
    const rollbackDetailsObj = {
      is_rollback_record: true,
      target_transaction_id: entry.id,
      original_action: entry.action,
      rollback_reason: rollbackReasonInput,
      quantity_reversed: delta,
      beam_name: combo.beams?.beam_name || entry.beam_name,
      combination_name: combo.combination_name || entry.combination_name,
      series_code: combo.beams?.sarees?.series_code || entry.series_code,
      user_name: req.user.full_name || req.user.username || 'Administrator',
      rollback_date: rollbackDate
    };

    const { data: rollbackEntry, error: insertRollbackErr } = await supabase
      .from('stock_history')
      .insert({
        saree_id: entry.saree_id,
        combination_id: entry.combination_id,
        beam_name: entry.beam_name,
        combination_name: entry.combination_name,
        old_stock: currentStock,
        new_stock: newStock,
        action: 'Undo',
        reason: JSON.stringify(rollbackDetailsObj),
        owner_id: req.user.owner_id,
        changed_by: req.user.id,
        changed_by_name: req.user.full_name || req.user.username || 'Administrator'
      })
      .select()
      .single();

    if (insertRollbackErr) throw insertRollbackErr;

    // 7. Mark original history entry as rolled back
    const updatedOriginalDetails = {
      ...details,
      is_rolled_back: true,
      rollback_date: rollbackDate,
      rollback_by: req.user.id,
      rollback_by_name: req.user.full_name || req.user.username || 'Administrator',
      rollback_reason: rollbackReasonInput,
      rollback_transaction_id: rollbackEntry?.id || null
    };

    await supabase
      .from('stock_history')
      .update({
        is_undone: true,
        reason: JSON.stringify(updatedOriginalDetails)
      })
      .eq('id', historyId)
      .eq('owner_id', req.user.owner_id);

    // 8. Record in activity_logs
    await supabase.from('activity_logs').insert({
      user_id: req.user.id,
      user_name: req.user.full_name || req.user.username,
      action: 'ROLLBACK_TRANSACTION',
      entity_type: 'stock_history',
      entity_id: historyId,
      owner_id: req.user.owner_id,
      details: {
        original_transaction_id: historyId,
        rollback_transaction_id: rollbackEntry?.id,
        original_action: entry.action,
        old_stock: currentStock,
        new_stock: newStock,
        delta,
        reason: rollbackReasonInput
      }
    });

    res.json({
      message: 'Transaction successfully rolled back.',
      original_id: historyId,
      rollback_id: rollbackEntry?.id,
      old_stock: currentStock,
      new_stock: newStock,
      delta
    });
  } catch (error) {
    console.error('rollbackStockChange error:', error);
    res.status(500).json({ error: 'Failed to rollback transaction' });
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
      .select('*, sarees(sari_name, series_code, image_url), combinations(id, combination_name, combination_colors(f_number, color_name, company_name))', { count: 'exact' })
      .eq('owner_id', req.user.owner_id);

    if (saree_id) {
      query = query.eq('saree_id', saree_id);
    }
    if (action === 'Rolled Back') {
      query = query.eq('is_undone', true);
    } else if (action === 'Rollback') {
      query = query.or('action.eq.Rollback,action.eq.Undo');
    } else if (action === 'Delivery') {
      query = query.or('action.eq.Delivery,reason.ilike.%Machine Delivery%');
    } else if (action === 'Stock Delivery') {
      query = query.or('action.eq.Stock Delivery,reason.ilike.%Stock Delivered%');
    } else if (action === 'Stock') {
      query = query.or('action.eq.Stock,action.eq.Increase,reason.ilike.%Stock In%');
    } else if (action === 'all') {
      // Fetch all including rolled back
    } else if (action) {
      query = query.eq('action', action);
    } else {
      // Default: hide rolled-back entries and undo logs for a clean active history log
      query = query.eq('is_undone', false).neq('action', 'Undo').neq('action', 'Rollback');
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
        .eq('owner_id', req.user.owner_id)
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
          action: entry.action === 'Increase' ? 'Stock Added' : entry.action === 'Decrease' ? 'Delivery' : entry.action,
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

      const isRolledBack = Boolean(entry.is_undone || (details && details.is_rolled_back));
      const isRollbackRecord = entry.action === 'Rollback' || Boolean(details && details.is_rollback_record);

      let effectiveAction = details?.action_detail || details?.action || entry.action;
      const rawText = (entry.reason || '') + ' ' + (details?.remarks || '');
      if (rawText.includes('Machine Delivery') || rawText.includes('Delivery (Machine)')) {
        effectiveAction = 'Delivery';
      } else if (rawText.includes('Stock Delivered')) {
        effectiveAction = 'Stock Delivery';
      } else if (rawText.includes('Stock In')) {
        effectiveAction = 'Stock';
      }

      const rollbackDate = (details && details.rollback_date) || (isRolledBack ? entry.updated_at || entry.created_at : null);
      const rollbackBy = (details && details.rollback_by) || null;
      const rollbackByName = (details && details.rollback_by_name) || (isRolledBack ? entry.changed_by_name : null);
      const rollbackReason = (details && details.rollback_reason) || (entry.action === 'Rollback' || isRollbackRecord ? details?.rollback_reason : null);
      const rollbackTransactionId = (details && details.rollback_transaction_id) || (entry.action === 'Rollback' || isRollbackRecord ? details?.target_transaction_id : null);

      const colors = entry.combinations?.combination_colors || details?.colors || [];

      return {
        ...entry,
        action: isRollbackRecord ? 'Rollback' : effectiveAction,
        is_rolled_back: isRolledBack,
        is_rollback: isRollbackRecord,
        rollback_date: rollbackDate,
        rollback_by: rollbackBy,
        rollback_by_name: rollbackByName,
        rollback_reason: rollbackReason,
        rollback_transaction_id: rollbackTransactionId,
        combination_colors: colors,
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

module.exports = { updateStock, undoStockChange, rollbackStockChange, getHistory };
