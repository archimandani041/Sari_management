/**
 * WhatsApp Message Parser — V2 (Multi-Entry, Smart Parsing)
 *
 * Parses WhatsApp messages into structured arrays.
 */
const { supabase } = require('../config/supabase');

// Lines to skip (noise from WhatsApp)
const NOISE_PATTERNS = [
  /^\d{1,2}:\d{2}\s*(am|pm)?/i,      // timestamps 12:34 AM or 11:30 AM
  /^\d{1,2}\/\d{1,2}\/\d{2,4}/,       // dates 12/03/2024
  /^\+?\d[\d\s\-]{8,}/,               // phone numbers
  /^forwarded$/i,                      // "Forwarded"
  /^today$/i,                          // "Today"
  /^yesterday$/i,                      // "Yesterday"
];

const isNoiseLine = (line) => NOISE_PATTERNS.some(p => p.test(line));

// Strip emojis + extra whitespace from a line (keep textual content)
const cleanLine = (line) => {
  return line
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Regex Patterns
const BEAM_PATTERN = /^(.+?\bbeam)\b\s*:?$/i; // matches "White Beam:" or "BLACK Beam"
const SERIES_PATTERN = /^([A-Z]{2,}\d{3,}[A-Z]?)(?:\s*\((.+?)\))?$/i; // matches "KS526F (Urgent Delivery)"
// COLOR_PATTERN: captures F#, then the rest of the line (greedy). Company is extracted separately below.
const COLOR_PATTERN = /^(F[\s\-\.]*\d+)\s*[:.\-]+\s*(.+)$/i; // matches "F-1: Red (Ramdev)" or "F-1 :. White ( Spon )"
const STOCK_PATTERN = /^(\d+)\s*(?:pcs|pieces?|pc|nos)?\s*(?:\/\s*-?|-\s*\/?)?\s*$/i; // matches "99 pcs", "99 pcs/-", "300 Pcs /-", "300"

// Check if a line looks like a new beam header
const isBeamHeader = (line) => {
  return BEAM_PATTERN.test(line);
};

// Split raw lines into multiple entry blocks starting at each Beam header
const splitIntoBlocks = (lines) => {
  const blocks = [];
  let currentBlock = [];

  for (const line of lines) {
    if (isBeamHeader(line) && currentBlock.length > 0) {
      blocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);
  return blocks;
};

/**
 * Normalize a beam name to Title Case for consistent matching.
 * "BLACK beam" and "black beam" and "Black Beam" all become "Black Beam".
 */
const normalizeBeamName = (name) => {
  if (!name) return name;
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Given a raw color line value (everything after "F-1 :"),
 * extract the color_name and company_name.
 *
 * Rules:
 *  - Strip any leading punctuation (e.g. ". " from "F-3 :. Red")
 *  - If the value ends with one or more (...) groups, the LAST group is company_name
 *  - Everything before the last (...) group is color_name
 *
 * Examples:
 *   "Wine (2213) ( Spon )"   → { color_name: "Wine (2213)", company_name: "Spon" }
 *   "Deep champion"           → { color_name: "Deep champion", company_name: null }
 *   "Gold ( spon ) (2221)"   → { color_name: "Gold ( spon )", company_name: "2221" }
 *   ". Red ( spon )"          → { color_name: "Red",          company_name: "spon" }
 */
const extractColorAndCompany = (raw) => {
  // Strip leading dots/punctuation (handles "F-3 :. Red")
  let value = raw.replace(/^[.\s]+/, '').trim();

  // Find the last parenthesized group at the end of the string
  const lastParenMatch = value.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (lastParenMatch) {
    return {
      color_name: lastParenMatch[1].trim(),
      company_name: lastParenMatch[2].trim() || null
    };
  }

  // No parenthesized group found
  return { color_name: value, company_name: null };
};

// Parse a single block into structured data
const parseBlock = (lines) => {
  const entry = {
    beam_name: null,
    series_code: null,
    series_base: null,
    series_letter: null,
    combination_name: null,
    stock: null,
    colors: []
  };

  for (const line of lines) {
    // 1. Beam Name
    if (!entry.beam_name) {
      const beamMatch = line.match(BEAM_PATTERN);
      if (beamMatch) {
        entry.beam_name = normalizeBeamName(beamMatch[1]);
        continue;
      }
    }

    // 2. Series Code (e.g., "KS526F (Urgent Delivery)")
    if (!entry.series_code) {
      const seriesMatch = line.match(SERIES_PATTERN);
      if (seriesMatch && /^[A-Z]{2,}\d{3,}/i.test(seriesMatch[1])) {
        const code = seriesMatch[1].toUpperCase();
        const letterMatch = code.match(/^([A-Z]+\d+)([A-Z])$/);
        if (letterMatch) {
          entry.series_base = letterMatch[1];
          entry.series_letter = letterMatch[2];
        } else {
          entry.series_base = code;
          entry.series_letter = 'A';
        }
        entry.series_code = code;
        entry.combination_name = seriesMatch[2]?.trim() || null;
        continue;
      }
    }

    // 3. F-Colors (unlimited F-1, F-2, F-3...)
    const colorMatch = line.match(COLOR_PATTERN);
    if (colorMatch) {
      const rawF = colorMatch[1].replace(/[^Ff\d]/g, '');
      const fNum = 'F-' + rawF.replace(/^[Ff]/i, '');
      const { color_name, company_name } = extractColorAndCompany(colorMatch[2]);
      entry.colors.push({ f_number: fNum, color_name, company_name });
      continue;
    }

    // 4. Stock (e.g. "99 pcs", "99 pcs/-", "99 Pieces", etc.)
    if (entry.stock === null) {
      const stockMatch = line.match(STOCK_PATTERN);
      if (stockMatch) {
        entry.stock = parseInt(stockMatch[1], 10);
        continue;
      }

      // Inline fallback
      const inlineMatch = line.match(/(\d+)\s*(?:pcs|pieces?|pc|nos)\b/i);
      if (inlineMatch) {
        entry.stock = parseInt(inlineMatch[1], 10);
        continue;
      }
    }
  }

  return entry;
};

/**
 * Generate a fingerprint string for an entry to detect exact duplicates.
 * Two entries are "identical" if beam, series code, colors, and stock all match.
 */
const entryFingerprint = (entry) => {
  const colorKey = (entry.colors || [])
    .map(c => `${(c.f_number || '').trim().toUpperCase()}:${(c.color_name || '').trim().toLowerCase()}`)
    .sort()
    .join('|');
  return [
    (entry.beam_name || '').trim().toLowerCase(),
    (entry.series_code || '').trim().toUpperCase(),
    String(entry.stock ?? ''),
    colorKey
  ].join('||');
};

// Main handler
const parseWhatsAppMessage = (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Clean and filter lines
    const rawLines = message.split('\n');
    const lines = rawLines
      .map(cleanLine)
      .filter(l => l.length > 0)
      .filter(l => !isNoiseLine(l));

    if (lines.length === 0) {
      return res.status(422).json({ error: 'No usable content found in the message.' });
    }

    // Split into blocks (one per beam/entry)
    const blocks = splitIntoBlocks(lines);
    const entries = blocks.map(parseBlock);

    // Filter out completely empty entries
    const rawValid = entries.filter(e =>
      e.beam_name || e.series_code || e.colors.length > 0 || e.stock !== null
    );

    if (rawValid.length === 0) {
      return res.status(422).json({ error: 'Could not parse any entries from the message. Please check the format.' });
    }

    // Deduplicate: if the user paste contains the exact same block twice, keep only one
    const fingerprintToIndex = new Map(); // fp -> index in validEntries
    const validEntries = [];
    const duplicateEntries = []; // entries that were exact duplicates

    for (const entry of rawValid) {
      const fp = entryFingerprint(entry);
      if (fingerprintToIndex.has(fp)) {
        const originalIdx = fingerprintToIndex.get(fp);
        const original = validEntries[originalIdx];
        duplicateEntries.push({
          entry,
          duplicateOf: {
            entryNumber: originalIdx + 1,
            beam_name: original.beam_name,
            series_code: original.series_code,
            stock: original.stock,
            colorSummary: (original.colors || []).map(c => `${c.f_number}: ${c.color_name}`).join(', ')
          }
        });
      } else {
        fingerprintToIndex.set(fp, validEntries.length);
        validEntries.push(entry);
      }
    }

    // Validation warnings (only for valid entries)
    const warnings = [];
    validEntries.forEach((entry, i) => {
      const prefix = validEntries.length > 1 ? `Entry ${i + 1}: ` : '';
      if (!entry.beam_name) warnings.push(`${prefix}Beam name not found.`);
      if (!entry.series_code) warnings.push(`${prefix}Series Code not found.`);
      if (entry.stock === null) warnings.push(`${prefix}Stock quantity not found.`);
      if (entry.colors.length === 0) warnings.push(`${prefix}No color information found.`);
    });

    res.json({
      entries: validEntries,
      duplicateEntries,       // client uses this for confirmation dialog
      warnings,
      totalEntries: validEntries.length
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: 'Failed to parse message' });
  }
};

/**
 * POST /api/parser/whatsapp-webhook
 * Receive WhatsApp incoming message to automatically update stocks.
 */
const handleWhatsAppWebhook = async (req, res) => {
  try {
    let messageText = req.body.Body || req.body.message || req.body.text;

    // Support WhatsApp Cloud API nested structure
    if (!messageText && req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body) {
      messageText = req.body.entry[0].changes[0].value.messages[0].text.body;
    }

    if (!messageText?.trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    // Resolve ownerId based on the sender's mobile number
    let fromNumber = req.body.From || req.body.from;
    if (!fromNumber && req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from) {
      fromNumber = req.body.entry[0].changes[0].value.messages[0].from;
    }

    let ownerId = null;
    if (fromNumber) {
      const cleanPhone = fromNumber.replace(/\D/g, '');
      if (cleanPhone) {
        const last10 = cleanPhone.slice(-10);
        // Query suppliers with matching mobile ending in last10
        const { data: matchedSuppliers } = await supabase
          .from('suppliers')
          .select('owner_id')
          .like('mobile', `%${last10}`)
          .limit(1);
        if (matchedSuppliers && matchedSuppliers.length > 0) {
          ownerId = matchedSuppliers[0].owner_id;
        }
      }
    }

    // Fallback if no supplier is matched (for backward compatibility)
    if (!ownerId) {
      const { data: firstAdmin } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1);
      if (firstAdmin && firstAdmin.length > 0) {
        ownerId = firstAdmin[0].id;
      } else {
        const { data: anyUser } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        if (anyUser && anyUser.length > 0) {
          ownerId = anyUser[0].id;
        }
      }
    }

    // Clean and split lines
    const rawLines = messageText.split('\n');
    const lines = rawLines
      .map(cleanLine)
      .filter(l => l.length > 0)
      .filter(l => !isNoiseLine(l));

    if (lines.length === 0) {
      return res.status(422).json({ error: 'No usable content found in the message.' });
    }

    // Split into blocks and parse
    const blocks = splitIntoBlocks(lines);
    const parsedEntries = blocks.map(parseBlock);

    const results = [];

    for (const entry of parsedEntries) {
      if (!entry.series_code) {
        results.push({ entry, status: 'skipped', reason: 'No series code found' });
        continue;
      }
      if (!entry.beam_name) {
        results.push({ entry, status: 'skipped', reason: 'No beam name found' });
        continue;
      }
      if (entry.stock === null) {
        results.push({ entry, status: 'skipped', reason: 'No stock quantity found' });
        continue;
      }

      // 1. Find the Saree by series_code (case-insensitive) and ownerId
      const { data: sarees, error: sareeError } = await supabase
        .from('sarees')
        .select('id, series_code, sari_name')
        .eq('owner_id', ownerId)
        .ilike('series_code', entry.series_code.trim())
        .limit(1);

      if (sareeError) throw sareeError;
      if (!sarees || sarees.length === 0) {
        results.push({ entry, status: 'skipped', reason: `Saree with series code ${entry.series_code} not found` });
        continue;
      }
      const saree = sarees[0];

      // 2. Find or create the Beam under this Saree
      let { data: beams, error: beamError } = await supabase
        .from('beams')
        .select('id, beam_name')
        .eq('saree_id', saree.id)
        .ilike('beam_name', entry.beam_name.trim())
        .limit(1);

      if (beamError) throw beamError;

      let beam;
      if (!beams || beams.length === 0) {
        // Create the beam
        const { data: newBeam, error: createBeamError } = await supabase
          .from('beams')
          .insert({ saree_id: saree.id, beam_name: entry.beam_name.trim() })
          .select().single();
        if (createBeamError) throw createBeamError;
        beam = newBeam;
      } else {
        beam = beams[0];
      }

      // 3. Find combinations under this Beam and their colors
      const { data: combos, error: comboError } = await supabase
        .from('combinations')
        .select(`
          id,
          combination_name,
          current_stock,
          minimum_stock,
          combination_colors (
            f_number,
            color_name,
            company_name
          )
        `)
        .eq('beam_id', beam.id);

      if (comboError) throw comboError;

      // Fingerprint entry colors
      const entryFingerprint = (entry.colors || [])
        .map(c => `${c.f_number.trim().toUpperCase()}:${c.color_name.trim().toLowerCase()}`)
        .sort()
        .join('|');

      let matchedCombo = null;
      for (const combo of combos) {
        const comboColors = combo.combination_colors || [];
        const comboFingerprint = comboColors
          .map(c => `${c.f_number.trim().toUpperCase()}:${c.color_name.trim().toLowerCase()}`)
          .sort()
          .join('|');
        if (comboFingerprint === entryFingerprint) {
          matchedCombo = combo;
          break;
        }
      }

      let originalStock = 0;
      let finalStock = 0;
      let actionType = 'Manual Edit';
      let isNewCombo = false;

      // Determine stock change (relative or absolute)
      // Check if message line contains + or - sign before the stock number
      const originalStockLine = lines.find(l => STOCK_PATTERN.test(l) || /(\+|-)\s*\d+/.test(l));
      let isRelative = false;
      let relativeSign = 1;
      if (originalStockLine) {
        const signMatch = originalStockLine.match(/(\+|-)/);
        if (signMatch) {
          isRelative = true;
          relativeSign = signMatch[1] === '-' ? -1 : 1;
        }
      }

      if (matchedCombo) {
        originalStock = matchedCombo.current_stock || 0;
        if (isRelative) {
          finalStock = Math.max(0, originalStock + (relativeSign * entry.stock));
          actionType = relativeSign > 0 ? 'Increase' : 'Decrease';
        } else {
          finalStock = entry.stock;
          actionType = 'Manual Edit';
        }

        // Update combination
        const { error: updateError } = await supabase
          .from('combinations')
          .update({ current_stock: finalStock, updated_at: new Date().toISOString() })
          .eq('id', matchedCombo.id);
        if (updateError) throw updateError;
      } else {
        // Create new combination
        isNewCombo = true;
        originalStock = 0;
        finalStock = entry.stock;

        const nextComboNum = combos.length + 1;
        const comboName = `Combination ${nextComboNum}`;

        const { data: newCombo, error: insertComboError } = await supabase
          .from('combinations')
          .insert({
            beam_id: beam.id,
            combination_name: comboName,
            current_stock: finalStock,
            minimum_stock: 20,
            sort_order: combos.length
          })
          .select().single();

        if (insertComboError) throw insertComboError;

        // Insert colors
        if (entry.colors?.length > 0) {
          const colorsPayload = entry.colors.map(col => ({
            combination_id: newCombo.id,
            f_number: col.f_number,
            color_name: col.color_name,
            company_name: col.company_name
          }));
          const { error: insertColorsError } = await supabase
            .from('combination_colors')
            .insert(colorsPayload);
          if (insertColorsError) throw insertColorsError;
        }

        matchedCombo = { id: newCombo.id, combination_name: comboName };
      }

      // 4. Log Stock History
      const quantityChanged = finalStock - originalStock;
      const actionDisplay = actionType === 'Increase' ? 'Stock Added' : actionType === 'Decrease' ? 'Delivery' : 'Manual Edit';
      const reasonCategory = actionType === 'Increase' ? 'WhatsApp Purchase Request' : 'WhatsApp Adjustment';
      const supplierName = entry.colors?.[0]?.company_name || null;

      const transactionDetails = {
        sari_number: saree.series_code || 'UNKNOWN',
        beam_name: beam.beam_name || 'UNKNOWN',
        combination_name: matchedCombo.combination_name || 'Combination',
        action: actionDisplay,
        opening_stock: originalStock,
        quantity_changed: quantityChanged,
        closing_stock: finalStock,
        reason_category: reasonCategory,
        supplier_name: supplierName,
        customer_name: null,
        invoice_number: null,
        delivery_notes: null,
        remarks: isNewCombo ? `Created via WhatsApp Incoming` : `Updated via WhatsApp Incoming`,
        user_name: 'WhatsApp System'
      };

      const userDisplayName = 'WhatsApp System';
      await supabase.from('stock_history').insert({
        saree_id: saree.id,
        combination_id: matchedCombo.id,
        beam_name: beam.beam_name,
        combination_name: matchedCombo.combination_name,
        old_stock: originalStock,
        new_stock: finalStock,
        action: actionType,
        reason: JSON.stringify(transactionDetails),
        owner_id: ownerId,
        changed_by_name: userDisplayName
      });

      // 5. Log Activity
      await supabase.from('activity_logs').insert({
        action: isNewCombo ? 'CREATE_COMBINATION_WHATSAPP' : 'UPDATE_STOCK_WHATSAPP',
        entity_type: 'combination',
        entity_id: matchedCombo.id,
        user_name: userDisplayName,
        details: {
          saree_code: saree.series_code,
          beam_name: beam.beam_name,
          combination_name: matchedCombo.combination_name,
          old_stock: originalStock,
          new_stock: finalStock,
          message: messageText
        }
      });

      results.push({
        entry,
        status: 'success',
        action: isNewCombo ? 'created' : 'updated',
        saree_code: saree.series_code,
        beam_name: beam.beam_name,
        combination_name: matchedCombo.combination_name,
        old_stock: originalStock,
        new_stock: finalStock
      });
    }

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Incoming Webhook error:', error);
    res.status(500).json({ error: 'Internal server error processing incoming message' });
  }
};

module.exports = { parseWhatsAppMessage, handleWhatsAppWebhook };
