/**
 * Saree Controller - V2 Hierarchical Model
 * Saree → Beams → Combinations → Colors
 */
const { supabase } = require('../config/supabase');

// ─────────────────────────────────────────────
// HELPER: check if error is a stale-token FK violation
// (user ID in JWT no longer exists in users table)
// ─────────────────────────────────────────────
const isStaleFkError = (error) =>
  error?.code === '23503' &&
  (error?.details?.includes('created_by') ||
    error?.details?.includes('updated_by') ||
    error?.details?.includes('changed_by') ||
    error?.details?.includes('user_id'));

// ─────────────────────────────────────────────
// HELPER: log activity
// ─────────────────────────────────────────────
const logActivity = async (user, action, entityType, entityId, details) => {
  try {
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      user_name: user.full_name || user.username,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      owner_id: user.owner_id
    });
  } catch (e) {
    // Non-fatal: don't let activity log failures break the main operation
    console.warn('logActivity failed:', e.message);
  }
};

// ─────────────────────────────────────────────
// GET /api/sarees
// List all sarees with aggregated total stock
// ─────────────────────────────────────────────
const getSarees = async (req, res) => {
  try {
    const {
      page = 1, limit = 25, search = '', sort = 'newest', status = '', brand = '', saree_status = '',
      company = '', color = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);

    const ownerId = req.user.owner_id;

    // Fetch all sarees with beams → combinations → colors (owner-scoped)
    let query = supabase
      .from('sarees')
      .select(`
        *,
        beams (
          id, beam_name, sort_order,
          combinations (
            id, combination_name, current_stock, minimum_stock, notes, status, brand, sort_order, image_url, image_path, image_uploaded_at,
            combination_colors ( id, f_number, color_name, company_name, sort_order )
          )
        )
      `, { count: 'exact' })
      .eq('owner_id', ownerId);

    // Execute all filtering helper queries concurrently using Promise.all
    const filterPromises = {};

    if (brand) {
      query = query.eq('brand', brand);
    }
    if (saree_status) {
      filterPromises.saree_status = supabase
        .from('combinations')
        .select('beam_id, beams(saree_id)')
        .eq('status', saree_status)
        .eq('owner_id', ownerId);
    }
    if (company) {
      filterPromises.company = supabase
        .from('combination_colors')
        .select('combination_id, combinations(beam_id, beams(saree_id))')
        .ilike('company_name', `%${company}%`)
        .eq('owner_id', ownerId);
    }
    if (color) {
      filterPromises.color = supabase
        .from('combination_colors')
        .select('combination_id, combinations(beam_id, beams(saree_id))')
        .ilike('color_name', `%${color}%`)
        .eq('owner_id', ownerId);
    }
    if (search) {
      filterPromises.searchColors = supabase
        .from('combination_colors')
        .select('combination_id, combinations(beam_id, beams(saree_id))')
        .or(`color_name.ilike.%${search}%,company_name.ilike.%${search}%`)
        .eq('owner_id', ownerId);
      filterPromises.searchBeams = supabase
        .from('beams')
        .select('saree_id')
        .ilike('beam_name', `%${search}%`)
        .eq('owner_id', ownerId);
    }

    const filterKeys = Object.keys(filterPromises);
    console.time(`getSarees-FilterQueries-${ownerId}`);
    const filterResults = await Promise.all(Object.values(filterPromises));
    console.timeEnd(`getSarees-FilterQueries-${ownerId}`);
    const filterData = {};
    filterKeys.forEach((key, idx) => {
      filterData[key] = filterResults[idx].data || [];
    });


    // Status (In Stock / In Delivery) filter
    if (saree_status) {
      const statusSareeIds = filterData.saree_status.map(c => c.beams?.saree_id).filter(Boolean);
      query = query.in('id', statusSareeIds.length > 0 ? statusSareeIds : ['00000000-0000-0000-0000-000000000000']);
    }

    // Company filter
    if (company) {
      const companySareeIds = filterData.company.map(c => c.combinations?.beams?.saree_id).filter(Boolean);
      query = query.in('id', companySareeIds.length > 0 ? companySareeIds : ['00000000-0000-0000-0000-000000000000']);
    }

    // Color filter
    if (color) {
      const colorSareeIds = filterData.color.map(c => c.combinations?.beams?.saree_id).filter(Boolean);
      query = query.in('id', colorSareeIds.length > 0 ? colorSareeIds : ['00000000-0000-0000-0000-000000000000']);
    }

    // Search — only within this owner's sarees
    if (search) {
      const sareeIdsFromColors = filterData.searchColors.map(c => c.combinations?.beams?.saree_id).filter(Boolean);
      const sareeIdsFromBeams = filterData.searchBeams.map(b => b.saree_id).filter(Boolean);
      const extraIds = [...new Set([...sareeIdsFromColors, ...sareeIdsFromBeams])];

      if (extraIds.length > 0) {
        query = query.or(
          `series_code.ilike.%${search}%,series_base.ilike.%${search}%,sari_name.ilike.%${search}%,id.in.(${extraIds.join(',')})`
        );
      } else {
        query = query.or(
          `series_code.ilike.%${search}%,series_base.ilike.%${search}%,sari_name.ilike.%${search}%`
        );
      }
    }

    // Sorting
    switch (sort) {
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      case 'alpha': query = query.order('series_code', { ascending: true }); break;
      default: query = query.order('created_at', { ascending: false });
    }

    console.time(`getSarees-MainQuery-${ownerId}`);
    const { data, error, count } = await query.range(offset, offset + pageSize - 1);
    console.timeEnd(`getSarees-MainQuery-${ownerId}`);
    if (error) throw error;

    // Compute total stock per saree + apply status filter in JS
    let sarees = (data || []).map(s => {
      const totalStock = (s.beams || []).reduce((bSum, beam) =>
        bSum + (beam.combinations || []).reduce((cSum, c) => cSum + (c.current_stock || 0), 0), 0
      );
      const allCombos = (s.beams || []).flatMap(beam => beam.combinations || []);
      const hasLowStockCombo = allCombos.some(c => (c.current_stock ?? 0) <= (c.minimum_stock ?? 20));
      const minStock = (s.beams || []).reduce((min, beam) =>
        Math.min(min, ...(beam.combinations || []).map(c => c.minimum_stock || 20)), 20
      );
      return { ...s, total_stock: totalStock, min_stock: minStock, has_low_stock_combo: hasLowStockCombo };
    });

    // Status filter
    if (status === 'out') sarees = sarees.filter(s => s.total_stock === 0);
    else if (status === 'low') sarees = sarees.filter(s => s.total_stock > 0 && s.has_low_stock_combo);
    else if (status === 'healthy') sarees = sarees.filter(s => s.total_stock > 0 && !s.has_low_stock_combo);

    // Sort by stock if needed
    if (sort === 'stock_high') sarees.sort((a, b) => b.total_stock - a.total_stock);
    if (sort === 'stock_low') sarees.sort((a, b) => a.total_stock - b.total_stock);

    const total = status ? sarees.length : count;
    const paginated = status ? sarees.slice(offset, offset + pageSize) : sarees;

    res.json({
      sarees: paginated,
      pagination: { page: parseInt(page), limit: pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (error) {
    console.error('GetSarees error:', error);
    res.status(500).json({ error: 'Failed to fetch sarees' });
  }
};

// ─────────────────────────────────────────────
// GET /api/sarees/:id
// ─────────────────────────────────────────────
const getSareeById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: saree, error } = await supabase
      .from('sarees')
      .select(`
        *,
        beams (
          id, beam_name, sort_order,
          combinations (
            id, combination_name, current_stock, minimum_stock, notes, status, brand, sort_order, image_url, image_path, image_uploaded_at,
            combination_colors ( id, f_number, color_name, company_name, sort_order )
          )
        )
      `)
      .eq('id', id)
      .eq('owner_id', req.user.owner_id)
      .single();

    if (error || !saree) return res.status(404).json({ error: 'Saree not found' });

    // Sort nested arrays
    saree.beams?.sort((a, b) => a.sort_order - b.sort_order);
    saree.beams?.forEach(beam => {
      beam.combinations?.sort((a, b) => a.sort_order - b.sort_order);
      beam.combinations?.forEach(c => c.combination_colors?.sort((a, b) => a.sort_order - b.sort_order));
    });

    const { data: history } = await supabase
      .from('stock_history')
      .select('*')
      .eq('saree_id', id)
      .eq('owner_id', req.user.owner_id)
      .order('created_at', { ascending: false })
      .limit(30);

    res.json({ saree, history: history || [] });
  } catch (error) {
    console.error('GetSareeById error:', error);
    res.status(500).json({ error: 'Failed to fetch saree' });
  }
};

// ─────────────────────────────────────────────
// POST /api/sarees
// Create saree with beams → combinations → colors
// ─────────────────────────────────────────────
const createSaree = async (req, res) => {
  try {
    const {
      series_base, series_letter = 'A', sari_name, description,
      price, image_url, brand = 'KP', beams = []
    } = req.body;

    if (!series_base) return res.status(400).json({ error: 'Series base is required' });

    const seriesCode = (series_base.trim() + series_letter.trim()).toUpperCase();

    // Check database for duplicate Series Code — scoped to this owner
    const { data: dupSaree } = await supabase
      .from('sarees')
      .select('id')
      .eq('series_code', seriesCode)
      .eq('owner_id', req.user.owner_id)
      .limit(1);
    if (dupSaree && dupSaree.length > 0) {
      return res.status(400).json({ error: `Series Code ${seriesCode} already exists.` });
    }

    // Check duplicate beam names locally in request
    const beamNames = beams.map(b => b.beam_name.trim().toLowerCase());
    const duplicateBeamName = beams.find((b, idx) => beamNames.indexOf(b.beam_name.trim().toLowerCase()) !== idx)?.beam_name;
    if (duplicateBeamName) {
      return res.status(400).json({ error: `${duplicateBeamName} already exists for this sari.` });
    }

    // Check duplicate combinations locally in request
    for (const b of beams) {
      const comboNames = (b.combinations || []).map(c => (c.combination_name || '').trim().toLowerCase());
      const dupComboName = (b.combinations || []).find((c, idx) => comboNames.indexOf((c.combination_name || '').trim().toLowerCase()) !== idx)?.combination_name;
      if (dupComboName) {
        return res.status(400).json({ error: `Combination '${dupComboName}' already exists.` });
      }

      // Check duplicate color F numbers inside combinations locally
      for (const c of (b.combinations || [])) {
        const fNums = (c.colors || []).map(col => col.f_number.trim().toUpperCase());
        const dupF = (c.colors || []).find((col, idx) => fNums.indexOf(col.f_number.trim().toUpperCase()) !== idx)?.f_number;
        if (dupF) {
          return res.status(400).json({ error: `${dupF} already exists in this combination.` });
        }
      }
    }

    const { data: saree, error } = await supabase
      .from('sarees')
      .insert({
        series_base: series_base.trim().toUpperCase(),
        series_letter: series_letter.trim().toUpperCase(),
        sari_name: sari_name?.trim() || null,
        description,
        price: price != null ? parseFloat(price) : null,
        image_url,
        brand: brand || 'KP',
        owner_id: req.user.owner_id,
        created_by: req.user.id,
        updated_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: `Series Code ${seriesCode} already exists.` });
      throw error;
    }

    // Insert beams concurrently
    const beamPromises = beams.map(async (b, bi) => {
      const { data: beam, error: beamErr } = await supabase
        .from('beams')
        .insert({ saree_id: saree.id, beam_name: b.beam_name.trim(), sort_order: bi, owner_id: req.user.owner_id })
        .select().single();
      if (beamErr) throw beamErr;
      return { original: b, saved: beam };
    });
    const insertedBeams = await Promise.all(beamPromises);

    // Insert combinations concurrently across all beams
    const comboPromises = [];
    for (const { original: b, saved: beam } of insertedBeams) {
      for (let ci = 0; ci < (b.combinations || []).length; ci++) {
        const c = b.combinations[ci];
        comboPromises.push((async () => {
          const { data: combo, error: comboErr } = await supabase
            .from('combinations')
            .insert({
              beam_id: beam.id,
              combination_name: c.combination_name ? c.combination_name.trim() : null,
              current_stock: parseInt(c.current_stock) || 0,
              minimum_stock: parseInt(c.minimum_stock) || 20,
              notes: c.notes || null,
              status: c.status || 'In Stock',
              brand: c.brand || 'KP',
              sort_order: ci,
              owner_id: req.user.owner_id
            })
            .select().single();
          if (comboErr) throw comboErr;

          const nestedPromises = [];
          // Insert colors
          if (c.colors?.length > 0) {
            nestedPromises.push(
              supabase.from('combination_colors').insert(
                c.colors.map((col, fi) => ({
                  combination_id: combo.id,
                  f_number: col.f_number.trim().toUpperCase(),
                  color_name: col.color_name.trim(),
                  company_name: col.company_name?.trim() || null,
                  sort_order: fi,
                  owner_id: req.user.owner_id
                }))
              )
            );
          }

          // Stock history for initial stock
          if (parseInt(c.current_stock) > 0) {
            nestedPromises.push(
              supabase.from('stock_history').insert({
                saree_id: saree.id,
                combination_id: combo.id,
                beam_name: b.beam_name.trim(),
                combination_name: c.combination_name ? c.combination_name.trim() : `Combination ${ci + 1}`,
                old_stock: 0,
                new_stock: parseInt(c.current_stock),
                action: 'Manual Edit',
                reason: 'Initial stock on creation',
                owner_id: req.user.owner_id,
                changed_by: req.user.id,
                changed_by_name: req.user.full_name
              })
            );
          }
          await Promise.all(nestedPromises);
        })());
      }
    }
    await Promise.all(comboPromises);

    await logActivity(req.user, 'CREATE_SAREE', 'saree', saree.id, {
      series_code: saree.series_code, sari_name
    });

    // Return complete saree
    const { data: result } = await supabase
      .from('sarees')
      .select(`*, beams(id, beam_name, sort_order, combinations(id, combination_name, current_stock, minimum_stock, notes, status, brand, sort_order, image_url, image_path, image_uploaded_at, combination_colors(id, f_number, color_name, company_name, sort_order)))`)
      .eq('id', saree.id).single();

    res.status(201).json({ saree: result });
  } catch (error) {
    console.error('CreateSaree error:', error);
    if (isStaleFkError(error)) {
      return res.status(401).json({
        error: 'Session expired: your user account was not found. Please log out and log in again.',
        code: 'STALE_SESSION'
      });
    }
    res.status(500).json({ error: 'Failed to create saree' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/sarees/:id
// Update top-level saree fields only
// ─────────────────────────────────────────────
const updateSaree = async (req, res) => {
  try {
    const { id } = req.params;
    const { series_base, series_letter, sari_name, description, price, image_url, brand } = req.body;

    const { data: existing } = await supabase.from('sarees').select('*').eq('id', id).eq('owner_id', req.user.owner_id).single();
    if (!existing) return res.status(404).json({ error: 'Saree not found' });

    const newBase = series_base !== undefined ? series_base.trim().toUpperCase() : existing.series_base;
    const newLetter = series_letter !== undefined ? series_letter.trim().toUpperCase() : existing.series_letter;
    const newSeriesCode = newBase + newLetter;

    if (newSeriesCode !== existing.series_code) {
      const { data: dupSaree } = await supabase
        .from('sarees')
        .select('id')
        .eq('series_code', newSeriesCode)
        .eq('owner_id', req.user.owner_id)
        .neq('id', id)
        .limit(1);
      if (dupSaree && dupSaree.length > 0) {
        return res.status(400).json({ error: `Series Code ${newSeriesCode} already exists.` });
      }
    }

    const updateData = { updated_by: req.user.id, updated_at: new Date().toISOString() };
    if (series_base !== undefined) updateData.series_base = newBase;
    if (series_letter !== undefined) updateData.series_letter = newLetter;
    if (sari_name !== undefined) updateData.sari_name = sari_name?.trim() || null;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price != null ? parseFloat(price) : null;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (brand !== undefined) updateData.brand = brand;

    const { data: saree, error } = await supabase
      .from('sarees').update(updateData).eq('id', id).select().single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: `Series Code ${newSeriesCode} already exists.` });
      throw error;
    }
    if (!saree) return res.status(404).json({ error: 'Saree not found' });

    await logActivity(req.user, 'UPDATE_SAREE', 'saree', id, { updated_fields: Object.keys(updateData) });

    res.json({ saree });
  } catch (error) {
    console.error('UpdateSaree error:', error);
    if (isStaleFkError(error)) {
      return res.status(401).json({
        error: 'Session expired: your user account was not found. Please log out and log in again.',
        code: 'STALE_SESSION'
      });
    }
    res.status(500).json({ error: 'Failed to update saree' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/sarees/:id  (hard delete, cascade)
// ─────────────────────────────────────────────
const deleteSaree = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: existing } = await supabase.from('sarees').select('*').eq('id', id).eq('owner_id', req.user.owner_id).single();
    if (!existing) return res.status(404).json({ error: 'Saree not found' });

    // 1. Fetch beams and combinations to delete related records
    const { data: beams } = await supabase.from('beams').select('id').eq('saree_id', id);
    const beamIds = (beams || []).map(b => b.id);

    let comboIds = [];
    if (beamIds.length > 0) {
      const { data: combos } = await supabase.from('combinations').select('id').in('beam_id', beamIds);
      comboIds = (combos || []).map(c => c.id);
    }

    // 2. Delete combination_colors
    if (comboIds.length > 0) {
      await supabase.from('combination_colors').delete().in('combination_id', comboIds);
    }

    // 3. Delete combination_suppliers
    if (comboIds.length > 0) {
      await supabase.from('combination_suppliers').delete().in('combination_id', comboIds);
    }

    // 4. Delete stock_history
    await supabase.from('stock_history').delete().eq('saree_id', id);
    if (comboIds.length > 0) {
      await supabase.from('stock_history').delete().in('combination_id', comboIds);
    }

    // 5. Delete stock_requests
    await supabase.from('stock_requests').delete().eq('saree_id', id);
    if (comboIds.length > 0) {
      await supabase.from('stock_requests').delete().in('combination_id', comboIds);
    }

    // 6. Delete activity_logs
    await supabase.from('activity_logs').delete().eq('entity_id', id);
    if (beamIds.length > 0) {
      await supabase.from('activity_logs').delete().in('entity_id', beamIds);
    }
    if (comboIds.length > 0) {
      await supabase.from('activity_logs').delete().in('entity_id', comboIds);
    }

    // 7. Delete combinations
    if (comboIds.length > 0) {
      await supabase.from('combinations').delete().in('id', comboIds);
    }

    // 8. Delete beams
    if (beamIds.length > 0) {
      await supabase.from('beams').delete().in('id', beamIds);
    }

    // 9. Delete saree itself
    const { error: sareeDeleteErr } = await supabase.from('sarees').delete().eq('id', id);
    if (sareeDeleteErr) throw sareeDeleteErr;

    // 10. Delete image from Supabase Storage
    if (existing.image_url) {
      const bucketMarker = `/saree-images/`;
      const idx = existing.image_url.indexOf(bucketMarker);
      if (idx !== -1) {
        const filePath = existing.image_url.substring(idx + bucketMarker.length);
        if (filePath) {
          try {
            await supabase.storage.from('saree-images').remove([filePath]);
          } catch (storageErr) {
            console.warn('Failed to delete storage image:', storageErr.message);
          }
        }
      }
    }

    res.json({ message: `${existing.series_code} permanently deleted` });
  } catch (error) {
    console.error('DeleteSaree error:', error);
    res.status(500).json({ error: 'Failed to delete saree' });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/sarees/:id/next-series
// ─────────────────────────────────────────────
const nextSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: saree } = await supabase.from('sarees').select('*').eq('id', id).eq('owner_id', req.user.owner_id).single();
    if (!saree) return res.status(404).json({ error: 'Saree not found' });

    const nextLetter = String.fromCharCode(saree.series_letter.charCodeAt(0) + 1);
    if (nextLetter > 'Z') return res.status(400).json({ error: 'Cannot advance beyond Z' });

    const { data: updated, error } = await supabase
      .from('sarees').update({ series_letter: nextLetter, updated_at: new Date().toISOString(), updated_by: req.user.id })
      .eq('id', id).select().single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: `Series ${saree.series_base}${nextLetter} already exists` });
      throw error;
    }

    await logActivity(req.user, 'ADVANCE_SERIES', 'saree', id, {
      from: `${saree.series_base}${saree.series_letter}`, to: `${saree.series_base}${nextLetter}`
    });

    res.json({ saree: updated });
  } catch (error) {
    console.error('NextSeries error:', error);
    res.status(500).json({ error: 'Failed to advance series' });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/sarees/:id/set-series
// ─────────────────────────────────────────────
const setSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const { series_letter } = req.body;
    
    if (!series_letter || series_letter.length !== 1 || series_letter < 'A' || series_letter > 'Z') {
      return res.status(400).json({ error: 'Invalid series letter. Must be between A and Z.' });
    }

    const { data: saree } = await supabase.from('sarees').select('*').eq('id', id).eq('owner_id', req.user.owner_id).single();
    if (!saree) return res.status(404).json({ error: 'Saree not found' });

    const { data: updated, error } = await supabase
      .from('sarees').update({ series_letter: series_letter.toUpperCase(), updated_at: new Date().toISOString(), updated_by: req.user.id })
      .eq('id', id).select().single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: `Series ${saree.series_base}${series_letter.toUpperCase()} already exists` });
      throw error;
    }

    await logActivity(req.user, 'SET_SERIES', 'saree', id, {
      from: `${saree.series_base}${saree.series_letter}`, to: `${saree.series_base}${series_letter.toUpperCase()}`
    });

    res.json({ saree: updated });
  } catch (error) {
    console.error('SetSeries error:', error);
    res.status(500).json({ error: 'Failed to set series' });
  }
};

// ═══════════════════════════════════════════════
// =============================================
// BEAM OPERATIONS
// =============================================

// POST /api/sarees/:id/beams
const addBeam = async (req, res) => {
  try {
    const { id: saree_id } = req.params;
    const { beam_name } = req.body;
    if (!beam_name?.trim()) return res.status(400).json({ error: 'Beam name is required' });

    // Verify saree ownership
    const { data: sareeCheck } = await supabase
      .from('sarees')
      .select('id')
      .eq('id', saree_id)
      .eq('owner_id', req.user.owner_id)
      .single();
    if (!sareeCheck) return res.status(404).json({ error: 'Saree not found' });

    // Check duplicate beam names
    const { data: dupBeam } = await supabase
      .from('beams')
      .select('id')
      .eq('saree_id', saree_id)
      .eq('beam_name', beam_name.trim())
      .eq('owner_id', req.user.owner_id)
      .limit(1);
    if (dupBeam && dupBeam.length > 0) {
      return res.status(400).json({ error: `${beam_name.trim()} already exists for this sari.` });
    }

    const { data: existing } = await supabase.from('beams').select('id').eq('saree_id', saree_id).eq('owner_id', req.user.owner_id);
    const sort_order = (existing || []).length;

    const { data: beam, error } = await supabase
      .from('beams').insert({ saree_id, beam_name: beam_name.trim(), sort_order, owner_id: req.user.owner_id }).select().single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: `${beam_name.trim()} already exists for this sari.` });
      throw error;
    }

    await logActivity(req.user, 'ADD_BEAM', 'beam', beam.id, { saree_id, beam_name });
    res.status(201).json({ beam });
  } catch (error) {
    console.error('AddBeam error:', error);
    res.status(500).json({ error: 'Failed to add beam' });
  }
};

// PUT /api/beams/:beamId
const updateBeam = async (req, res) => {
  try {
    const { beamId } = req.params;
    const { beam_name } = req.body;
    if (!beam_name?.trim()) return res.status(400).json({ error: 'Beam name is required' });

    const { data: old } = await supabase.from('beams').select('beam_name, saree_id').eq('id', beamId).eq('owner_id', req.user.owner_id).single();
    if (!old) return res.status(404).json({ error: 'Beam not found' });

    // Check duplicate beam names
    const { data: dupBeam } = await supabase
      .from('beams')
      .select('id')
      .eq('saree_id', old.saree_id)
      .eq('beam_name', beam_name.trim())
      .eq('owner_id', req.user.owner_id)
      .neq('id', beamId)
      .limit(1);
    if (dupBeam && dupBeam.length > 0) {
      return res.status(400).json({ error: `${beam_name.trim()} already exists for this sari.` });
    }

    const { data: beam, error } = await supabase
      .from('beams').update({ beam_name: beam_name.trim(), updated_at: new Date().toISOString() })
      .eq('id', beamId).eq('owner_id', req.user.owner_id).select().single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: `${beam_name.trim()} already exists for this sari.` });
      throw error;
    }

    await logActivity(req.user, 'RENAME_BEAM', 'beam', beamId, { from: old?.beam_name, to: beam_name });
    res.json({ beam });
  } catch (error) {
    console.error('UpdateBeam error:', error);
    res.status(500).json({ error: 'Failed to update beam' });
  }
};

// DELETE /api/beams/:beamId
const deleteBeam = async (req, res) => {
  try {
    const { beamId } = req.params;
    const { data: beam } = await supabase.from('beams').select('beam_name, saree_id').eq('id', beamId).eq('owner_id', req.user.owner_id).single();
    if (!beam) return res.status(404).json({ error: 'Beam not found' });

    // Delete stock history for this beam's combinations
    const { data: combos } = await supabase.from('combinations').select('id').eq('beam_id', beamId).eq('owner_id', req.user.owner_id);
    if (combos?.length) {
      const ids = combos.map(c => c.id);
      await supabase.from('stock_history').delete().in('combination_id', ids).eq('owner_id', req.user.owner_id);
    }

    const { error } = await supabase.from('beams').delete().eq('id', beamId).eq('owner_id', req.user.owner_id);
    if (error) throw error;

    await logActivity(req.user, 'DELETE_BEAM', 'beam', beamId, { beam_name: beam?.beam_name });
    res.json({ message: `Beam "${beam?.beam_name}" deleted` });
  } catch (error) {
    console.error('DeleteBeam error:', error);
    res.status(500).json({ error: 'Failed to delete beam' });
  }
};

// =============================================
// COMBINATION OPERATIONS
// =============================================

// POST /api/beams/:beamId/combinations
const addCombination = async (req, res) => {
  try {
    const { beamId } = req.params;
    const { combination_name, current_stock = 0, minimum_stock = 20, notes, colors = [], status = 'In Stock', brand = 'KP' } = req.body;

    const { data: beam } = await supabase.from('beams').select('saree_id, beam_name').eq('id', beamId).eq('owner_id', req.user.owner_id).single();
    if (!beam) return res.status(404).json({ error: 'Beam not found' });

    // Check duplicate combination names — only enforce when a non-empty name is given.
    // Blank/unnamed combinations have no meaningful name to deduplicate against.
    if (combination_name?.trim()) {
      const { data: dupCombo } = await supabase
        .from('combinations')
        .select('id')
        .eq('beam_id', beamId)
        .eq('combination_name', combination_name.trim())
        .eq('owner_id', req.user.owner_id)
        .limit(1);
      if (dupCombo && dupCombo.length > 0) {
        return res.status(400).json({ error: `Combination '${combination_name}' already exists.` });
      }
    }

    // Check duplicate F numbers locally
    const fNums = colors.map(col => col.f_number.trim().toUpperCase());
    const dupF = colors.find((col, idx) => fNums.indexOf(col.f_number.trim().toUpperCase()) !== idx)?.f_number;
    if (dupF) {
      return res.status(400).json({ error: `${dupF} already exists in this combination.` });
    }

    const { data: existing } = await supabase.from('combinations').select('id').eq('beam_id', beamId).eq('owner_id', req.user.owner_id);
    const sort_order = (existing || []).length;

    const { data: combo, error } = await supabase
      .from('combinations')
      .insert({
        beam_id: beamId,
        combination_name: combination_name ? combination_name.trim() : null,
        current_stock: parseInt(current_stock),
        minimum_stock: parseInt(minimum_stock),
        notes: notes || null,
        status: status || 'In Stock',
        brand: brand || 'KP',
        sort_order,
        owner_id: req.user.owner_id
      })
      .select().single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: `Combination '${combination_name || ''}' already exists.` });
      throw error;
    }

    if (colors.length > 0) {
      const { error: colorErr } = await supabase.from('combination_colors').insert(
        colors.map((c, i) => ({ combination_id: combo.id, f_number: c.f_number.trim().toUpperCase(), color_name: c.color_name.trim(), company_name: c.company_name?.trim() || null, sort_order: i, owner_id: req.user.owner_id }))
      );
      if (colorErr) {
        // cleanup combination if color insert failed
        await supabase.from('combinations').delete().eq('id', combo.id).eq('owner_id', req.user.owner_id);
        if (colorErr.code === '23505') return res.status(400).json({ error: `Color code already exists in this combination.` });
        throw colorErr;
      }
    }

    if (parseInt(current_stock) > 0 && beam?.saree_id) {
      await supabase.from('stock_history').insert({
        saree_id: beam.saree_id, combination_id: combo.id, beam_name: beam.beam_name,
        combination_name: combination_name ? combination_name.trim() : `Combination ${sort_order + 1}`,
        old_stock: 0, new_stock: parseInt(current_stock), action: 'Manual Edit',
        reason: 'New combination added', changed_by: req.user.id, changed_by_name: req.user.full_name,
        owner_id: req.user.owner_id
      });
    }

    await logActivity(req.user, 'ADD_COMBINATION', 'combination', combo.id, { beam_id: beamId, combination_name });

    const { data: result } = await supabase
      .from('combinations').select('*, combination_colors(*)').eq('id', combo.id).eq('owner_id', req.user.owner_id).single();
    res.status(201).json({ combination: result });
  } catch (error) {
    console.error('AddCombination error:', error);
    res.status(500).json({ error: 'Failed to add combination' });
  }
};

// PUT /api/combinations/:comboId
const updateCombination = async (req, res) => {
  try {
    const { comboId } = req.params;
    const { combination_name, current_stock, minimum_stock, notes, colors, status, brand } = req.body;

    const { data: old } = await supabase
      .from('combinations').select('*, beams(saree_id, beam_name, id)').eq('id', comboId).single();
    if (!old) return res.status(404).json({ error: 'Combination not found' });
    if (old.owner_id && old.owner_id !== req.user.owner_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check duplicate combination names
    if (combination_name !== undefined) {
      const { data: dupCombo } = await supabase
        .from('combinations')
        .select('id')
        .eq('beam_id', old.beams.id)
        .eq('combination_name', combination_name?.trim() || null)
        .eq('owner_id', req.user.owner_id)
        .neq('id', comboId)
        .limit(1);
      if (dupCombo && dupCombo.length > 0) {
        return res.status(400).json({ error: `Combination '${combination_name || ''}' already exists.` });
      }
    }

    // Check duplicate F numbers locally
    if (colors !== undefined) {
      const fNums = colors.map(col => col.f_number.trim().toUpperCase());
      const dupF = colors.find((col, idx) => fNums.indexOf(col.f_number.trim().toUpperCase()) !== idx)?.f_number;
      if (dupF) {
        return res.status(400).json({ error: `${dupF} already exists in this combination.` });
      }
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (combination_name !== undefined) updateData.combination_name = combination_name ? combination_name.trim() : null;
    if (current_stock !== undefined) updateData.current_stock = parseInt(current_stock);
    if (minimum_stock !== undefined) updateData.minimum_stock = parseInt(minimum_stock);
    if (notes !== undefined) updateData.notes = notes || null;
    if (status !== undefined) updateData.status = status;
    if (brand !== undefined) updateData.brand = brand;

    const { data: combo, error } = await supabase
      .from('combinations').update(updateData).eq('id', comboId).select().single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: `Combination '${combination_name || ''}' already exists.` });
      throw error;
    }

    // Log stock change
    const historyAction = req.body.history_action || req.body.action || 'Manual Edit';
    const isStockChanged = current_stock !== undefined && parseInt(current_stock) !== old.current_stock;
    const hasExplicitHistory = Boolean(req.body.history_action || (req.body.action && req.body.action !== 'Manual Edit'));

    if (isStockChanged || hasExplicitHistory) {
      const sareeId = old.beams?.saree_id;

      await supabase.from('stock_history').insert({
        saree_id: sareeId,
        combination_id: comboId,
        beam_name: old.beams?.beam_name,
        combination_name: old.combination_name || 'Combination',
        old_stock: old.current_stock,
        new_stock: current_stock !== undefined ? parseInt(current_stock) : old.current_stock,
        action: historyAction === 'Stock' || historyAction === 'Increase' ? 'Increase' : (historyAction === 'Stock Delivery' || historyAction === 'Decrease' ? 'Decrease' : 'Manual Edit'),
        reason: JSON.stringify({
          sari_number: old.beams?.sarees?.series_code || 'UNKNOWN',
          beam_name: old.beams?.beam_name || 'UNKNOWN',
          combination_name: old.combination_name || 'Combination',
          action: historyAction,
          action_detail: historyAction,
          opening_stock: old.current_stock,
          quantity_changed: (historyAction === 'Stock Delivery' || historyAction === 'Decrease')
            ? -(req.body.quantity !== undefined ? parseInt(req.body.quantity) : Math.abs((current_stock !== undefined ? parseInt(current_stock) : old.current_stock) - old.current_stock))
            : (req.body.quantity !== undefined ? parseInt(req.body.quantity) : Math.abs((current_stock !== undefined ? parseInt(current_stock) : old.current_stock) - old.current_stock)),
          closing_stock: current_stock !== undefined ? parseInt(current_stock) : old.current_stock,
          reason_category: historyAction,
          remarks: req.body.reason || '',
          user_name: req.user.full_name || req.user.username || 'System'
        }),
        changed_by: req.user.id,
        changed_by_name: req.user.full_name,
        owner_id: req.user.owner_id
      });
      await logActivity(req.user, 'UPDATE_STOCK', 'combination', comboId, {
        beam: old.beams?.beam_name, combo: old.combination_name,
        from: old.current_stock, to: parseInt(current_stock)
      });
    }

    // Update colors: replace all
    if (colors !== undefined) {
      await supabase.from('combination_colors').delete().eq('combination_id', comboId).eq('owner_id', req.user.owner_id);
      if (colors.length > 0) {
        const { error: colorErr } = await supabase.from('combination_colors').insert(
          colors.map((c, i) => ({ combination_id: comboId, f_number: c.f_number.trim().toUpperCase(), color_name: c.color_name.trim(), company_name: c.company_name?.trim() || null, sort_order: i, owner_id: req.user.owner_id }))
        );
        if (colorErr) {
          if (colorErr.code === '23505') return res.status(400).json({ error: `Color code already exists in this combination.` });
          throw colorErr;
        }
        await logActivity(req.user, 'UPDATE_COLORS', 'combination', comboId, { colors });
      }
    }

    if (combination_name !== undefined && combination_name !== old.combination_name) {
      await logActivity(req.user, 'RENAME_COMBINATION', 'combination', comboId, {
        from: old.combination_name, to: combination_name
      });
    }

    const { data: result } = await supabase
      .from('combinations').select('*, combination_colors(*)').eq('id', comboId).eq('owner_id', req.user.owner_id).single();
    res.json({ combination: result });
  } catch (error) {
    console.error('UpdateCombination error:', error);
    res.status(500).json({ error: 'Failed to update combination' });
  }
};

// DELETE /api/combinations/:comboId
const deleteCombination = async (req, res) => {
  try {
    const { comboId } = req.params;
    const { data: combo } = await supabase.from('combinations').select('combination_name, owner_id, beams(beam_name)').eq('id', comboId).single();
    if (!combo) return res.status(404).json({ error: 'Combination not found' });
    if (combo.owner_id && combo.owner_id !== req.user.owner_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await supabase.from('stock_history').delete().eq('combination_id', comboId);
    const { error } = await supabase.from('combinations').delete().eq('id', comboId);
    if (error) throw error;

    await logActivity(req.user, 'DELETE_COMBINATION', 'combination', comboId, {
      name: combo?.combination_name, beam: combo?.beams?.beam_name
    });
    res.json({ message: 'Combination deleted' });
  } catch (error) {
    console.error('DeleteCombination error:', error);
    res.status(500).json({ error: 'Failed to delete combination' });
  }
};

// GET /api/sarees/search/advanced
const advancedSearch = async (req, res) => {
  try {
    const {
      q = '',
      sareeId = '',
      beamId = '',
      comboSearch = '',
      fColorSearch = '',
      stockStatus = 'all',
      beams = '',
      companies = '',
      minStock = '',
      maxStock = '',
      dateRange = 'all',
      startDate = '',
      endDate = '',
      hasImage = 'all'
    } = req.query;

    let query = supabase
      .from('combinations')
      .select(`
        *,
        beams!inner (
          id, beam_name, saree_id,
          sarees!inner (
            id, series_code, series_base, series_letter, sari_name, image_url, price, created_at, updated_at
          )
        ),
        combination_colors (
          id, f_number, color_name, company_name, sort_order
        )
      `)
      .eq('owner_id', req.user.owner_id);

    const { data: rawCombinations, error } = await query;
    if (error) throw error;

    let results = (rawCombinations || []).map(combo => {
      const saree = combo.beams?.sarees;
      return {
        id: combo.id,
        beam_id: combo.beam_id,
        combination_name: combo.combination_name,
        current_stock: combo.current_stock || 0,
        minimum_stock: combo.minimum_stock || 20,
        notes: combo.notes,
        status: combo.status,
        brand: combo.brand,
        created_at: combo.created_at,
        updated_at: combo.updated_at,
        beam_name: combo.beams?.beam_name,
        saree_id: combo.beams?.saree_id,
        series_code: saree?.series_code,
        sari_name: saree?.sari_name,
        image_url: combo.image_url || saree?.image_url,
        price: saree?.price,
        combination_colors: combo.combination_colors || []
      };
    });

    if (sareeId) {
      results = results.filter(r => r.saree_id === sareeId);
    }

    if (beamId) {
      results = results.filter(r => r.beam_id === beamId);
    }

    if (comboSearch) {
      const searchLower = comboSearch.toLowerCase();
      results = results.filter(r =>
        (r.combination_name && r.combination_name.toLowerCase().includes(searchLower)) ||
        (r.notes && r.notes.toLowerCase().includes(searchLower))
      );
    }

    if (fColorSearch) {
      const searchLower = fColorSearch.toLowerCase();
      results = results.filter(r =>
        r.combination_colors.some(col =>
          col.color_name.toLowerCase().includes(searchLower) ||
          col.f_number.toLowerCase().includes(searchLower) ||
          (col.company_name && col.company_name.toLowerCase().includes(searchLower))
        )
      );
    }

    if (q) {
      const searchLower = q.toLowerCase();
      results = results.filter(r =>
        (r.series_code && r.series_code.toLowerCase().includes(searchLower)) ||
        (r.sari_name && r.sari_name.toLowerCase().includes(searchLower)) ||
        (r.beam_name && r.beam_name.toLowerCase().includes(searchLower)) ||
        (r.combination_name && r.combination_name.toLowerCase().includes(searchLower)) ||
        (r.notes && r.notes.toLowerCase().includes(searchLower)) ||
        r.combination_colors.some(col =>
          col.color_name.toLowerCase().includes(searchLower) ||
          col.f_number.toLowerCase().includes(searchLower) ||
          (col.company_name && col.company_name.toLowerCase().includes(searchLower))
        )
      );
    }

    if (stockStatus !== 'all') {
      if (stockStatus === 'in_stock') {
        results = results.filter(r => r.current_stock > 0);
      } else if (stockStatus === 'out_of_stock') {
        results = results.filter(r => r.current_stock === 0);
      } else if (stockStatus === 'low_stock') {
        results = results.filter(r => r.current_stock <= r.minimum_stock);
      }
    }

    if (beams) {
      const allowedBeams = beams.split(',').map(b => b.trim().toLowerCase());
      results = results.filter(r => r.beam_name && allowedBeams.includes(r.beam_name.toLowerCase()));
    }

    if (companies) {
      const allowedCompanies = companies.split(',').map(c => c.trim().toLowerCase());
      results = results.filter(r =>
        r.combination_colors.some(col => col.company_name && allowedCompanies.includes(col.company_name.toLowerCase()))
      );
    }

    if (minStock !== '') {
      results = results.filter(r => r.current_stock >= parseInt(minStock));
    }
    if (maxStock !== '') {
      results = results.filter(r => r.current_stock <= parseInt(maxStock));
    }

    if (dateRange !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      results = results.filter(r => {
        const updatedDate = new Date(r.updated_at || r.created_at);
        if (dateRange === 'today') {
          return updatedDate >= startOfDay;
        } else if (dateRange === 'week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return updatedDate >= oneWeekAgo;
        } else if (dateRange === 'month') {
          const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return updatedDate >= oneMonthAgo;
        } else if (dateRange === 'custom') {
          let keep = true;
          if (startDate) {
            keep = keep && updatedDate >= new Date(startDate);
          }
          if (endDate) {
            const endLimit = new Date(endDate);
            endLimit.setHours(23, 59, 59, 999);
            keep = keep && updatedDate <= endLimit;
          }
          return keep;
        }
        return true;
      });
    }

    if (hasImage !== 'all') {
      if (hasImage === 'yes') {
        results = results.filter(r => !!r.image_url);
      } else if (hasImage === 'no') {
        results = results.filter(r => !r.image_url);
      }
    }

    results.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    const uniqueBeams = [...new Set(rawCombinations.map(c => c.beams?.beam_name).filter(Boolean))];
    const uniqueCompanies = [...new Set(
      rawCombinations.flatMap(c => (c.combination_colors || []).map(col => col.company_name)).filter(Boolean)
    )];

    const { data: sareesList } = await supabase
      .from('sarees')
      .select('id, series_code, sari_name')
      .eq('owner_id', req.user.owner_id)
      .order('series_code', { ascending: true });

    const maxStockInDb = rawCombinations.reduce((max, c) => Math.max(max, c.current_stock || 0), 100);

    res.json({
      results,
      metadata: {
        sarees: sareesList || [],
        beams: uniqueBeams,
        companies: uniqueCompanies,
        maxStockLimit: maxStockInDb
      }
    });
  } catch (error) {
    console.error('AdvancedSearch error:', error);
    res.status(500).json({ error: 'Failed to execute advanced search' });
  }
};

module.exports = {
  getSarees, getSareeById, createSaree,  updateSaree,
  deleteSaree,
  nextSeries,
  setSeries,
  addBeam, updateBeam, deleteBeam,
  addCombination, updateCombination, deleteCombination, advancedSearch
};
