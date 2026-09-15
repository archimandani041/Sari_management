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
      supplier_name, customer_name, machine_name, invoice_number, user_name, group_by
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    let query = supabase.from('stock_history')
      .select('*, sarees(sari_name, series_code, image_url, brand), combinations(id, combination_name, current_stock, minimum_stock, brand, image_url, combination_colors(f_number, color_name, company_name))', { count: 'exact' })
      .eq('owner_id', req.user.owner_id);

    if (saree_id) query = query.eq('saree_id', saree_id);
    if (action && action !== 'all') {
      const actNorm = action.trim();
      if (actNorm === 'Stock In' || actNorm === 'Stock') {
        query = query.or('action.eq.Increase,action.eq.Stock In,action.eq.Stock,action.eq.Stock Added');
      } else if (actNorm === 'Stock Delivery' || actNorm === 'Decrease') {
        query = query.or('action.eq.Decrease,action.eq.Stock Delivery');
      } else if (actNorm === 'Delivery (Machine)' || actNorm === 'Delivery Machine' || actNorm === 'Delivery') {
        query = query.or('reason.ilike.%Machine Delivery%,reason.ilike.%Delivery (Machine)%,action.eq.Delivery (Machine),action.eq.Delivery Machine').not('reason', 'ilike', '%Stock Delivery%');
      } else {
        query = query.ilike('action', `%${actNorm}%`);
      }
    }

    if (from_date) query = query.gte('created_at', from_date);
    if (to_date) query = query.lte('created_at', to_date);

    if (search) {
      const cleanSearch = search.trim();
      const { data: matchedSarees } = await supabase
        .from('sarees').select('id').eq('owner_id', req.user.owner_id)
        .or(`series_code.ilike.%${cleanSearch}%,sari_name.ilike.%${cleanSearch}%`);

      const matchedSareeIds = (matchedSarees || []).map(s => s.id);
      const orParts = [
        `beam_name.ilike.%${cleanSearch}%`,
        `combination_name.ilike.%${cleanSearch}%`,
        `changed_by_name.ilike.%${cleanSearch}%`,
        `invoice_number.ilike.%${cleanSearch}%`,
        `supplier_name.ilike.%${cleanSearch}%`,
        `customer_name.ilike.%${cleanSearch}%`,
        `machine_name.ilike.%${cleanSearch}%`,
        `reason.ilike.%${cleanSearch}%`
      ];
      if (matchedSareeIds.length > 0) orParts.push(`saree_id.in.(${matchedSareeIds.join(',')})`);
      query = query.or(orParts.join(','));
    }

    if (supplier_name) query = query.ilike('supplier_name', `%${supplier_name}%`);
    if (customer_name) query = query.ilike('customer_name', `%${customer_name}%`);
    if (machine_name) query = query.ilike('machine_name', `%${machine_name}%`);
    if (invoice_number) query = query.ilike('invoice_number', `%${invoice_number}%`);
    if (user_name) query = query.ilike('changed_by_name', `%${user_name}%`);

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limitVal - 1);

    const { data: history, error, count } = await query;
    if (error) throw error;

    const formattedHistory = (history || []).map(entry => {
      let details = entry.metadata || {};
      try {
        if (entry.reason && (entry.reason.startsWith('{') || entry.reason.startsWith('['))) {
          details = { ...details, ...JSON.parse(entry.reason) };
        }
      } catch (e) {}

      const isRolledBack = Boolean(entry.is_undone || details.is_rolled_back);
      const isRollbackRecord = entry.action === 'Rollback' || entry.action === 'Undo' || Boolean(details.is_rollback_record);

      let uiAction = 'Adjustment';
      const act = (entry.action || '').trim();
      const dAct = details.action || details.action_detail || details.reason_category || '';
      const remarks = details.remarks || '';

      if (act === 'Increase' || dAct === 'Stock In' || dAct === 'Stock') {
        uiAction = 'Stock In';
      } else if (act === 'Decrease' || dAct === 'Stock Delivery') {
        uiAction = 'Stock Delivery';
      } else if (
        act === 'Delivery (Machine)' ||
        dAct === 'Delivery (Machine)' ||
        dAct === 'Delivery' ||
        remarks.includes('Machine Delivery')
      ) {
        uiAction = 'Delivery (Machine)';
      } else if (act === 'Rollback' || act === 'Undo' || entry.is_undone) {
        uiAction = 'Rollback';
      }

      return {
        ...entry,
        transaction_id: entry.id,
        image_url: entry.image_url || entry.combinations?.image_url || entry.sarees?.image_url,
        action: uiAction,
        is_rolled_back: isRolledBack,
        is_rollback: isRollbackRecord,
        rollback_date: details.rollback_date || (isRolledBack ? entry.updated_at : null),
        rollback_by_name: details.rollback_by_name || (isRolledBack ? entry.changed_by_name : null),
        rollback_reason: details.rollback_reason || entry.reason,
        combination_colors: entry.combinations?.combination_colors || details.colors || [],
        supplier_name: entry.supplier_name || details.supplier_name,
        customer_name: entry.customer_name || details.customer_name,
        machine_name: entry.machine_name || details.machine_name,
        invoice_number: entry.invoice_number || details.invoice_number,
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

const getLedgerStats = async (req, res) => {
  try {
    const ownerId = req.user.owner_id;

    // Query ALL stock history records for overall totals
    const { data: allRecords } = await supabase
      .from('stock_history')
      .select('*')
      .eq('owner_id', ownerId);

    let stockAdded = 0;
    let machineDeliveries = 0;
    let stockDeliveries = 0;

    (allRecords || []).forEach(r => {
      let details = {};
      try {
        if (r.reason && (r.reason.startsWith('{') || r.reason.startsWith('['))) {
          details = JSON.parse(r.reason);
        }
      } catch (e) {}

      const qty = Math.abs((r.new_stock ?? 0) - (r.old_stock ?? 0)) || (details.quantity_changed ? Math.abs(details.quantity_changed) : 0);
      const act = (r.action || '').trim();
      const dAct = details.action || details.action_detail || details.reason_category || '';
      const remarks = details.remarks || '';

      if (act === 'Increase' || dAct === 'Stock In' || dAct === 'Stock' || dAct === 'Purchase Received') {
        stockAdded += qty;
      } else if (act === 'Decrease' || dAct === 'Stock Delivery') {
        stockDeliveries += qty;
      } else if (
        act === 'Delivery (Machine)' ||
        dAct === 'Delivery (Machine)' ||
        dAct === 'Delivery' ||
        remarks.includes('Machine Delivery')
      ) {
        machineDeliveries += 1;
      }
    });

    res.json({
      todayStockAdded: stockAdded,
      todayDeliveries: machineDeliveries,
      todayStockDeliveries: stockDeliveries
    });
  } catch (err) {
    console.error('getLedgerStats error:', err);
    res.status(500).json({ error: 'Failed to compute ledger stats' });
  }
};

const deleteHistoryRecord = async (req, res) => {
  try {
    const { historyId } = req.params;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete history records.' });
    }

    // 1. Fetch the target history record
    const { data: entry, error: fetchErr } = await supabase
      .from('stock_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (fetchErr || !entry) {
      return res.status(404).json({ error: 'History record not found' });
    }

    if (entry.owner_id && req.user.owner_id && entry.owner_id !== req.user.owner_id) {
      return res.status(403).json({ error: 'Unauthorized to delete this record.' });
    }

    // 2. Perform Automatic Stock Rollback if entry has a combination_id
    if (entry.combination_id) {
      const { data: combo } = await supabase
        .from('combinations')
        .select('current_stock')
        .eq('id', entry.combination_id)
        .single();

      if (combo) {
        const currentStock = combo.current_stock ?? 0;
        let delta = 0;

        const act = (entry.action || '').toUpperCase();
        if (['STOCK', 'INCREASE', 'STOCK ADDED', 'STOCK IN', 'PURCHASE RECEIVED'].includes(act)) {
          const qty = Math.abs(entry.new_stock - entry.old_stock);
          delta = -qty;
        } else if (['STOCK DELIVERY', 'DECREASE', 'DELIVERY OUT', 'DAMAGE', 'RETURN'].includes(act)) {
          const qty = Math.abs(entry.old_stock - entry.new_stock);
          delta = +qty;
        } else if (act === 'DELIVERY') {
          delta = 0;
        } else {
          // Default: revert stock back to old_stock before this transaction
          delta = entry.old_stock - entry.new_stock;
        }

        const newStock = Math.max(0, currentStock + delta);

        // Apply updated stock level to combination
        await supabase
          .from('combinations')
          .update({ current_stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', entry.combination_id);
      }
    }

    // 3. Delete history record from DB
    const { error: deleteErr } = await supabase
      .from('stock_history')
      .delete()
      .eq('id', historyId);

    if (deleteErr) throw deleteErr;

    res.json({ message: 'Stock automatically rolled back and history row deleted successfully.', id: historyId });
  } catch (error) {
    console.error('deleteHistoryRecord error:', error);
    res.status(500).json({ error: 'Failed to rollback and delete history record' });
  }
};

module.exports = { updateStock, undoStockChange, rollbackStockChange, getHistory, getLedgerStats, deleteHistoryRecord };

