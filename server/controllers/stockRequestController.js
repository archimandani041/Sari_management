/**
 * Stock Request Controller
 * WhatsApp-based purchase request management
 */
const { supabase } = require('../config/supabase');

// ─── GET /api/stock-requests ─────────────────────────────────
const getStockRequests = async (req, res) => {
  try {
    const { status = '', page = 1, limit = 25 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('stock_requests')
      .select('*', { count: 'exact' })
      .eq('owner_id', req.user.owner_id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query.range(offset, offset + parseInt(limit) - 1);
    if (error) throw error;

    const formattedRequests = (data || []).map(r => ({
      ...r,
      quantity: r.requested_qty || r.quantity || 0,
      requested_qty: r.requested_qty || r.quantity || 0,
    }));

    res.json({
      requests: formattedRequests,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0 }
    });
  } catch (error) {
    console.error('GetStockRequests error:', error);
    res.status(500).json({ error: 'Failed to fetch stock requests' });
  }
};

// ─── POST /api/stock-requests ─────────────────────────────────
const createStockRequest = async (req, res) => {
  try {
    const {
      saree_id, combination_id,
      beam_name, combination_name, series_code,
      requested_qty, quantity, current_stock, minimum_stock,
      whatsapp_message, notes, movement_type
    } = req.body;

    const targetQty = parseInt(requested_qty || quantity);
    if (!combination_id) return res.status(400).json({ error: 'combination_id is required' });
    if (!targetQty || targetQty <= 0) return res.status(400).json({ error: 'requested_qty must be > 0' });

    const { data: combo, error: comboErr } = await supabase
      .from('combinations')
      .select('current_stock, combination_name, owner_id')
      .eq('id', combination_id)
      .single();
    if (comboErr || !combo) return res.status(404).json({ error: 'Combination not found' });
    if (combo.owner_id && combo.owner_id !== req.user.owner_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }



    const isDelivery = movement_type === 'DELIVERY_OUT';
    const oldStock = combo.current_stock || 0;
    const newStock = isDelivery ? (oldStock - targetQty) : (oldStock + targetQty);
    const newStatus = isDelivery ? 'In Delivery' : 'In Stock';

    if (isDelivery && newStock < 0) {
      return res.status(400).json({ error: 'Delivery quantity cannot exceed available stock.' });
    }


    const userName = req.user.full_name || req.user.username;

    // 1. Log to activity_logs
    await supabase.from('activity_logs').insert({
      action: isDelivery ? 'DELIVERY_STOCK_WHATSAPP' : 'REQUEST_STOCK_WHATSAPP',
      entity_type: 'combination',
      entity_id: combination_id,
      user_name: userName,
      owner_id: req.user.owner_id,
      details: {
        saree_code: series_code,
        beam_name,
        combination_name: combo.combination_name || combination_name,
        requested_qty: targetQty,
        old_stock: oldStock,
        new_stock: newStock
      }
    });

    const finalNotes = isDelivery
      ? `DELIVERY_OUT${notes ? `: ${notes}` : ''}`
      : `STOCK_IN${notes ? `: ${notes}` : ''}`;

    // 2. Create the stock request record
    const { data, error } = await supabase
      .from('stock_requests')
      .insert({
        saree_id: saree_id || null,
        combination_id,
        beam_name: beam_name || null,
        combination_name: combination_name || null,
        series_code: series_code || null,
        requested_qty: targetQty,
        current_stock: oldStock,
        minimum_stock: parseInt(minimum_stock) || 20,
        whatsapp_message: whatsapp_message || null,
        notes: finalNotes,
        status: 'Requested',
        owner_id: req.user.owner_id,
        requested_by: req.user.id,
        requested_by_name: userName
      })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ request: data });
  } catch (error) {
    console.error('CreateStockRequest error:', error);
    res.status(500).json({ error: 'Failed to create stock request' });
  }
};

// ─── PATCH /api/stock-requests/:id/status ────────────────────
const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const validStatuses = ['Requested', 'Confirmed', 'Received', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Fetch existing request first to check previous status
    const { data: existingReq } = await supabase
      .from('stock_requests')
      .select('*')
      .eq('id', id)
      .eq('owner_id', req.user.owner_id)
      .single();

    const updateData = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('stock_requests')
      .update(updateData)
      .eq('id', id)
      .eq('owner_id', req.user.owner_id)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Request not found' });

    // If status transitioned to Received, update combination stock and log stock_history
    if (status === 'Received' && existingReq?.status !== 'Received' && data.combination_id) {
      const { data: combo } = await supabase
        .from('combinations')
        .select('current_stock, combination_name, beam_id, beams(saree_id, beam_name)')
        .eq('id', data.combination_id)
        .single();

      if (combo) {
        const oldStock = combo.current_stock ?? 0;
        const qty = data.requested_qty || 0;
        const isDelivery = data.notes?.startsWith('DELIVERY_OUT');
        const newStock = isDelivery ? Math.max(0, oldStock - qty) : (oldStock + qty);

        await supabase
          .from('combinations')
          .update({ current_stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', data.combination_id);

        const dbAction = isDelivery ? 'Decrease' : 'Increase';
        const historyAction = isDelivery ? 'Stock Delivery' : 'Stock In';
        const sareeId = data.saree_id || combo.beams?.saree_id || null;

        await supabase.from('stock_history').insert({
          saree_id: sareeId,
          combination_id: data.combination_id,
          beam_name: data.beam_name || combo.beams?.beam_name || 'Beam',
          combination_name: data.combination_name || combo.combination_name || 'Combination',
          old_stock: oldStock,
          new_stock: newStock,
          action: dbAction,
          reason: JSON.stringify({
            sari_number: data.series_code || 'UNKNOWN',
            beam_name: data.beam_name || 'UNKNOWN',
            combination_name: data.combination_name || 'Combination',
            action: historyAction,
            action_detail: 'Stock Request Marked as Received',
            opening_stock: oldStock,
            quantity_changed: isDelivery ? -qty : qty,
            closing_stock: newStock,
            reason_category: 'Stock Request Fulfillment',
            remarks: notes || data.whatsapp_message || '',
            user_name: req.user.full_name || req.user.username || 'System'
          }),
          changed_by: req.user.id || null,
          changed_by_name: req.user.full_name || req.user.username || 'System',
          owner_id: req.user.owner_id
        });
      }
    }

    res.json({ request: data });
  } catch (error) {
    console.error('UpdateRequestStatus error:', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
};

// ─── DELETE /api/stock-requests/:id ──────────────────────────
const deleteStockRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('stock_requests').delete().eq('id', id).eq('owner_id', req.user.owner_id);
    if (error) throw error;
    res.json({ message: 'Stock request deleted' });
  } catch (error) {
    console.error('DeleteStockRequest error:', error);
    res.status(500).json({ error: 'Failed to delete stock request' });
  }
};

module.exports = { getStockRequests, createStockRequest, updateRequestStatus, deleteStockRequest };
