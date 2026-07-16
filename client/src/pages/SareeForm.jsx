/**
 * Add / Edit Saree Form — V2 Hierarchical
 * Supports WhatsApp message paste, beam + combination + F-color management
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sareeAPI, parserAPI, uploadAPI } from '../services/api';
import {
  Box, Paper, TextField, Button, Typography, Grid, IconButton,
  Divider, Alert, CircularProgress, Chip, Accordion, AccordionSummary,
  AccordionDetails, Tooltip, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogActions, Fade, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUpload from '@mui/icons-material/CloudUpload';
import ArrowBack from '@mui/icons-material/ArrowBack';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';

// ── A single F-color row ──────────────────────────────────────────
const ColorRow = ({ color, index, onChange, onRemove, isDuplicate }) => (
  <Grid container spacing={1.5} sx={{ mb: 1, alignItems: 'center' }}>
    <Grid size={{ xs: 3, sm: 2 }}>
      <TextField size="small" fullWidth label="F #" value={color.f_number}
        error={isDuplicate}
        helperText={isDuplicate ? 'Dup' : ''}
        onChange={e => onChange(index, 'f_number', e.target.value)} />
    </Grid>
    <Grid size={{ xs: 5, sm: 5 }}>
      <TextField size="small" fullWidth label="Color Name" value={color.color_name}
        onChange={e => onChange(index, 'color_name', e.target.value)} required />
    </Grid>
    <Grid size={{ xs: 3, sm: 4 }}>
      <TextField size="small" fullWidth label="Company (opt)" value={color.company_name || ''}
        onChange={e => onChange(index, 'company_name', e.target.value)} />
    </Grid>
    <Grid size={{ xs: 1, sm: 1 }}>
      <IconButton size="small" color="error" onClick={() => onRemove(index)}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Grid>
  </Grid>
);

// ── A single combination card ─────────────────────────────────────
const CombinationCard = ({ combo, comboIndex, isDuplicateName, onUpdate, onRemove }) => {
  const handleColorChange = (ci, field, val) => {
    const colors = [...combo.colors];
    colors[ci] = { ...colors[ci], [field]: val };
    onUpdate(comboIndex, { ...combo, colors });
  };
  const addColor = () => {
    const nextNum = combo.colors.length + 1;
    onUpdate(comboIndex, { ...combo, colors: [...combo.colors, { f_number: `F-${nextNum}`, color_name: '', company_name: '' }] });
  };
  const removeColor = (ci) => onUpdate(comboIndex, { ...combo, colors: combo.colors.filter((_, i) => i !== ci) });

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Chip label={`Combination ${comboIndex + 1}`} size="small" color="primary" variant="outlined" />
        <Box>
          <Tooltip title="Delete Combination"><IconButton size="small" color="error" onClick={() => onRemove(comboIndex)}>
            <DeleteIcon fontSize="small" />
          </IconButton></Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 1.5 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField size="small" fullWidth type="number" label="Stock" value={combo.current_stock}
            onChange={e => onUpdate(comboIndex, { ...combo, current_stock: e.target.value })}
            slotProps={{ htmlInput: { min: 0 } }} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={combo.status || 'In Stock'}
              label="Status"
              onChange={e => onUpdate(comboIndex, { ...combo, status: e.target.value })}
            >
              <MenuItem value="In Stock">In Stock</MenuItem>
              <MenuItem value="In Delivery">In Delivery</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <TextField size="small" fullWidth label="Notes (optional)" value={combo.notes || ''}
            onChange={e => onUpdate(comboIndex, { ...combo, notes: e.target.value })} />
        </Grid>
      </Grid>

      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block' }}>
        F-Colors
      </Typography>
      {combo.colors.map((color, ci) => {
        const isDuplicateColor = combo.colors.some((c, idx) => idx !== ci && c.f_number.trim().toUpperCase() === color.f_number.trim().toUpperCase());
        return (
          <ColorRow key={ci} color={color} index={ci} onChange={handleColorChange} onRemove={removeColor} isDuplicate={isDuplicateColor} />
        );
      })}
      <Button size="small" startIcon={<AddIcon />} onClick={addColor} sx={{ mt: 0.5 }}>
        Add Color Row
      </Button>
    </Paper>
  );
};

// ── Main Form Component ───────────────────────────────────────────
const SareeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileInputRef = useRef(null);

  // Top-level saree fields
  const [seriesBase, setSeriesBase] = useState('');
  const [seriesLetter, setSeriesLetter] = useState('A');
  const [sariName, setSariName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [brand, setBrand] = useState('KP');

  // Beams structure: [{ beam_name, combinations: [{ combination_name, current_stock, notes, colors }] }]
  const [beams, setBeams] = useState([{ beam_name: '', combinations: [newCombo()] }]);

  // WhatsApp paste
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parseError, setParseError] = useState('');
  const [parsedEntries, setParsedEntries] = useState([]);
  const [parseWarnings, setParseWarnings] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mismatchEntry, setMismatchEntry] = useState(null);
  const [selectedPreviewRows, setSelectedPreviewRows] = useState([]);

  // Duplicate Resolution queue states
  const [dupQueue, setDupQueue] = useState([]);
  const [activeDup, setActiveDup] = useState(null);
  const [importAccumulator, setImportAccumulator] = useState([]);

  // Level 1 Saree Duplicate states
  const [sareeDupOpen, setSareeDupOpen] = useState(false);
  const [dupSareeId, setDupSareeId] = useState('');
  const [dupSeriesCode, setDupSeriesCode] = useState('');
  const [seriesCodeError, setSeriesCodeError] = useState(false);

  // Level 4 WhatsApp Import duplicate saree states
  const [sareeExistQueue, setSareeExistQueue] = useState([]);
  const [activeSareeExist, setActiveSareeExist] = useState(null);

  // Blocked-entries confirmation dialog
  const [blockedConfirmOpen, setBlockedConfirmOpen] = useState(false);
  const [blockedConfirmData, setBlockedConfirmData] = useState(null);
  // blockedConfirmData = { targetCode, blockedEntries: [...], allowedEntries: [...], warnings: [...] }

  // Duplicate-entries confirmation dialog
  const [dupConfirmOpen, setDupConfirmOpen] = useState(false);
  const [dupConfirmData, setDupConfirmData] = useState(null);
  // dupConfirmData = { uniqueEntries: [...], duplicateEntries: [{entry, duplicateOf}], warnings: [...] }

  // "All detected sarees already exist" warning
  const [allSareesExistOpen, setAllSareesExistOpen] = useState(false);
  const [allSareesExistCodes, setAllSareesExistCodes] = useState([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  function newCombo() {
    return { combination_name: '', current_stock: 0, notes: '', status: 'In Stock', colors: [{ f_number: 'F-1', color_name: '', company_name: '' }] };
  }

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      sareeAPI.getById(id).then(({ data }) => {
        const s = data.saree;
        setSeriesBase(s.series_base);
        setSeriesLetter(s.series_letter);
        setSariName(s.sari_name || '');
        setPrice(s.price != null ? String(s.price) : '');
        setDescription(s.description || '');
        setImageUrl(s.image_url || '');
        setStatus(s.status || 'In Stock');
        setBrand(s.brand || 'KP');

        let loadedBeams = [];
        if (s.beams?.length) {
          loadedBeams = s.beams.map(b => ({
            beam_name: b.beam_name,
            combinations: (b.combinations || []).map(c => ({
              combination_name: c.combination_name || '',
              current_stock: c.current_stock,
              notes: c.notes || '',
              status: c.status || 'In Stock',
              brand: c.brand || 'KP',
              colors: (c.combination_colors || []).map(col => ({
                f_number: col.f_number, color_name: col.color_name, company_name: col.company_name || ''
              }))
            }))
          }));
        }

        // Check if there is a pending import in sessionStorage
        const pendingImportStr = sessionStorage.getItem('pending_whatsapp_import');
        if (pendingImportStr) {
          try {
            const pendingEntries = JSON.parse(pendingImportStr);
            let updatedBeams = [...loadedBeams];

            for (const entry of pendingEntries) {
              const targetCombo = {
                combination_name: entry.combination_name || '',
                current_stock: entry.stock || 0,
                notes: '',
                status: 'In Stock',
                brand: 'KP',
                colors: entry.colors && entry.colors.length > 0
                  ? entry.colors
                  : [{ f_number: 'F-1', color_name: '', company_name: '' }]
              };

              if (entry.beam_name) {
                const existingBeamIdx = updatedBeams.findIndex(b =>
                  b.beam_name.toLowerCase() === entry.beam_name.toLowerCase()
                );

                if (existingBeamIdx >= 0) {
                  const existingCombos = updatedBeams[existingBeamIdx].combinations;
                  const entryColorKey = (entry.colors || []).map(c => `${c.f_number}:${c.color_name}`).sort().join('|').toLowerCase();

                  const dupIdx = existingCombos.findIndex(combo => {
                    const comboNameMatch = (combo.combination_name || '').trim().toLowerCase() === (entry.combination_name || '').trim().toLowerCase();
                    const comboColorKey = (combo.colors || []).map(c => `${c.f_number}:${c.color_name}`).sort().join('|').toLowerCase();
                    return comboNameMatch && comboColorKey === entryColorKey;
                  });

                  if (dupIdx >= 0) {
                    existingCombos[dupIdx].current_stock = targetCombo.current_stock;
                  } else {
                    existingCombos.push(targetCombo);
                  }
                } else {
                  updatedBeams.push({
                    beam_name: entry.beam_name,
                    combinations: [targetCombo]
                  });
                }
              } else {
                if (updatedBeams.length === 0) updatedBeams.push({ beam_name: '', combinations: [] });
                updatedBeams[0].combinations.push(targetCombo);
              }
            }

            loadedBeams = updatedBeams;
            setSnack('Imported and merged WhatsApp entries into existing saree!');
          } catch (e) {
            console.error('Failed to parse pending import', e);
          } finally {
            sessionStorage.removeItem('pending_whatsapp_import');
          }
        }

        setBeams(loadedBeams.length ? loadedBeams : [{ beam_name: '', combinations: [newCombo()] }]);
      }).catch(() => setError('Failed to load saree')).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  // ── Beam operations ───────────────────────────────────────
  const addBeam = () => setBeams([...beams, { beam_name: '', combinations: [newCombo()] }]);
  const removeBeam = (bi) => setBeams(beams.filter((_, i) => i !== bi));
  const updateBeamName = (bi, val) => { const b = [...beams]; b[bi] = { ...b[bi], beam_name: val }; setBeams(b); };

  // ── Combination operations ────────────────────────────────
  const addCombo = (bi) => { const b = [...beams]; b[bi].combinations.push(newCombo()); setBeams(b); };
  const removeCombo = (bi, ci) => { const b = [...beams]; b[bi].combinations = b[bi].combinations.filter((_, i) => i !== ci); setBeams(b); };
  const updateCombo = (bi, ci, updated) => { const b = [...beams]; b[bi].combinations[ci] = updated; setBeams(b); };
  const duplicateCombo = (bi, ci) => {
    const b = [...beams];
    const clone = JSON.parse(JSON.stringify(b[bi].combinations[ci]));
    clone.combination_name = clone.combination_name ? `${clone.combination_name} (Copy)` : '';
    clone.current_stock = 0;
    b[bi].combinations.splice(ci + 1, 0, clone);
    setBeams(b);
  };

  // ── Frequency-based multi-saree target selector ──────────
  // Groups parsed entries by normalized series_code, ranks by frequency DESC then
  // first-appearance ASC, queries the DB once, and returns the best unexisting code.
  // Returns { targetCode, allowedEntries, blockedEntries } or null if all exist.
  const selectTargetSareeByFrequency = async (allEntries) => {
    const normalize = (code) => (code || '').trim().toUpperCase().replace(/\s+/g, '');

    // 1. Group entries by normalized code, track frequency and first index
    const groupMap = {};
    allEntries.forEach((entry, idx) => {
      const code = normalize(entry.series_code || entry.series_base);
      if (!code) return;
      if (!groupMap[code]) {
        groupMap[code] = { code, frequency: 0, firstIndex: idx, entries: [] };
      }
      groupMap[code].frequency++;
      groupMap[code].entries.push(entry);
    });

    // 2. Sort candidates: frequency DESC, firstIndex ASC
    const candidates = Object.values(groupMap).sort((a, b) =>
      b.frequency !== a.frequency ? b.frequency - a.frequency : a.firstIndex - b.firstIndex
    );

    if (candidates.length === 0) return null; // no codes detected at all

    // 3. Query DB once for all unique normalized codes
    const uniqueCodes = candidates.map(c => c.code);
    const existingNormalized = new Set();
    try {
      // Use a broad search and filter locally — avoids N+1 queries
      const searchParam = uniqueCodes.join(' ');
      const { data } = await sareeAPI.getAll({ search: searchParam, limit: 200 });
      (data.sarees || []).forEach(s => {
        existingNormalized.add(normalize(s.series_code));
      });
    } catch {
      // If DB check fails, proceed without filtering — don't block the import
    }

    // 4. Pick best available candidate
    const target = candidates.find(c => !existingNormalized.has(c.code));

    if (!target) {
      // All codes exist
      return { allExist: true, existingCodes: candidates.map(c => c.code) };
    }

    const targetCode = target.code;
    const allowedEntries = allEntries.filter(e => normalize(e.series_code || e.series_base) === targetCode);
    const blockedEntries = allEntries.filter(e => normalize(e.series_code || e.series_base) !== targetCode);

    return { targetCode, allowedEntries, blockedEntries, allExist: false };
  };

  // ── WhatsApp paste parser ─────────────────────────────────
  const handleParse = async () => {
    setParseError('');
    setParsedEntries([]);
    setParseWarnings([]);
    try {
      const { data } = await parserAPI.parseWhatsApp(pasteText);
      const allEntries = data.entries || [];
      if (allEntries.length === 0) {
        setParseError('Could not parse any entries from the message.');
        return;
      }

      const warnings = [...(data.warnings || [])];
      const duplicateEntries = data.duplicateEntries || [];

      // ── Step 1: Duplicate blocks check ────────────────────────────
      // If the server found exact duplicate blocks, show confirmation before removing
      if (duplicateEntries.length > 0) {
        setDupConfirmData({ uniqueEntries: allEntries, duplicateEntries, warnings });
        setDupConfirmOpen(true);
        setPasteOpen(false);
        return; // wait for user to confirm
      }

      // ── Step 2: Multi-saree detection with frequency-based target selection ──
      const distinctCodes = new Set(
        allEntries.map(e => (e.series_code || e.series_base || '').trim().toUpperCase()).filter(Boolean)
      );

      if (distinctCodes.size > 1 || (distinctCodes.size === 1 && seriesBase.trim() && !distinctCodes.has(seriesBase.trim().toUpperCase()))) {
        // Multiple sarees in the message — select the best target
        const result = await selectTargetSareeByFrequency(allEntries);

        if (!result) {
          // No recognizable codes, fall through to normal preview
        } else if (result.allExist) {
          setAllSareesExistCodes(result.existingCodes);
          setAllSareesExistOpen(true);
          setPasteOpen(false);
          return;
        } else if (result.blockedEntries.length > 0) {
          setBlockedConfirmData({ targetCode: result.targetCode, blockedEntries: result.blockedEntries, allowedEntries: result.allowedEntries, warnings });
          setBlockedConfirmOpen(true);
          setPasteOpen(false);
          return;
        } else {
          // All entries belong to the single target (edge case)
          setParsedEntries(result.allowedEntries);
          setSelectedPreviewRows(result.allowedEntries.map((_, i) => i));
          setParseWarnings(warnings);
          setPreviewOpen(true);
          setPasteOpen(false);
          return;
        }
      } else if (seriesBase.trim()) {
        // Single code in message — still enforce it matches the open form's series base
        const targetBase = seriesBase.trim().toUpperCase();
        const allowedEntries = allEntries.filter(e => {
          const entryBase = (e.series_base || '').trim().toUpperCase();
          return !entryBase || entryBase === targetBase;
        });
        const blockedEntries = allEntries.filter(e => {
          const entryBase = (e.series_base || '').trim().toUpperCase();
          return entryBase && entryBase !== targetBase;
        });
        if (blockedEntries.length > 0) {
          setBlockedConfirmData({ targetCode: targetBase, blockedEntries, allowedEntries, warnings });
          setBlockedConfirmOpen(true);
          setPasteOpen(false);
          return;
        }
        if (allowedEntries.length === 0) {
          setParseError(`None of the parsed entries belong to this saree (${targetBase}). Check the series code in the message.`);
          return;
        }
      }

      // No issues — proceed directly to preview
      setParsedEntries(allEntries);
      setSelectedPreviewRows(allEntries.map((_, i) => i));
      setParseWarnings(warnings);
      setPreviewOpen(true);
      setPasteOpen(false);
    } catch (e) {
      setParseError(e.response?.data?.error || 'Could not parse message');
    }
  };

  // Called when user confirms removal of blocked (wrong-saree) entries
  const confirmFilterAndProceed = () => {
    if (!blockedConfirmData) return;
    const { targetCode, blockedEntries, allowedEntries, warnings } = blockedConfirmData;
    const uniqueBlocked = [...new Set(blockedEntries.map(e => e.series_base || e.series_code).filter(Boolean))];
    const finalWarnings = [
      `${blockedEntries.length} entr${blockedEntries.length === 1 ? 'y' : 'ies'} for ${uniqueBlocked.join(', ')} removed — only "${targetCode}" entries imported.`,
      ...warnings
    ];
    setBlockedConfirmOpen(false);
    setBlockedConfirmData(null);
    setParsedEntries(allowedEntries);
    setSelectedPreviewRows(allowedEntries.map((_, i) => i));
    setParseWarnings(finalWarnings);
    setPreviewOpen(true);
  };

  // Called when user confirms removal of duplicate blocks
  const confirmDedupAndProceed = async () => {
    if (!dupConfirmData) return;
    const { uniqueEntries, duplicateEntries, warnings } = dupConfirmData;
    const finalWarnings = [
      `${duplicateEntries.length} duplicate block${duplicateEntries.length === 1 ? '' : 's'} removed from the pasted message.`,
      ...warnings
    ];
    setDupConfirmOpen(false);
    setDupConfirmData(null);

    // After dedup, still run the multi-saree enforcement on the remaining entries
    const distinctAfterDedup = new Set(
      uniqueEntries.map(e => (e.series_code || e.series_base || '').trim().toUpperCase()).filter(Boolean)
    );

    if (distinctAfterDedup.size > 1 || (distinctAfterDedup.size === 1 && seriesBase.trim() && !distinctAfterDedup.has(seriesBase.trim().toUpperCase()))) {
      const result = await selectTargetSareeByFrequency(uniqueEntries);
      if (result && result.allExist) {
        setAllSareesExistCodes(result.existingCodes);
        setAllSareesExistOpen(true);
        return;
      }
      if (result && result.blockedEntries.length > 0) {
        setBlockedConfirmData({ targetCode: result.targetCode, blockedEntries: result.blockedEntries, allowedEntries: result.allowedEntries, warnings: finalWarnings });
        setBlockedConfirmOpen(true);
        return;
      }
    } else if (seriesBase.trim()) {
      const targetBase = seriesBase.trim().toUpperCase();
      const allowedEntries = uniqueEntries.filter(e => { const b = (e.series_base || '').trim().toUpperCase(); return !b || b === targetBase; });
      const blockedEntries = uniqueEntries.filter(e => { const b = (e.series_base || '').trim().toUpperCase(); return b && b !== targetBase; });
      if (blockedEntries.length > 0) {
        setBlockedConfirmData({ targetCode: targetBase, blockedEntries, allowedEntries, warnings: finalWarnings });
        setBlockedConfirmOpen(true);
        return;
      }
    }

    setParsedEntries(uniqueEntries);
    setSelectedPreviewRows(uniqueEntries.map((_, i) => i));
    setParseWarnings(finalWarnings);
    setPreviewOpen(true);
  };

  // Check for duplicate combo (Same Beam + Same Series Code + Same Combination Name + Same F Colors)
  const detectDuplicate = (entry) => {
    const targetBase = seriesBase.trim().toUpperCase();
    const entryBase = (entry.series_base || '').trim().toUpperCase();
    if (entryBase && entryBase !== targetBase) {
      return null;
    }

    const beamIdx = beams.findIndex(b => b.beam_name.trim().toLowerCase() === (entry.beam_name || '').trim().toLowerCase());
    if (beamIdx < 0) return null;

    const existingCombos = beams[beamIdx].combinations;
    const entryColorKey = (entry.colors || []).map(c => `${c.f_number}:${c.color_name}`).sort().join('|').toLowerCase();

    const dupIdx = existingCombos.findIndex(combo => {
      const comboNameMatch = (combo.combination_name || '').trim().toLowerCase() === (entry.combination_name || '').trim().toLowerCase();
      const comboColorKey = (combo.colors || []).map(c => `${c.f_number}:${c.color_name}`).sort().join('|').toLowerCase();
      return comboNameMatch && comboColorKey === entryColorKey;
    });

    if (dupIdx >= 0) {
      return { beamIdx, comboIdx: dupIdx };
    }
    return null;
  };

  const detectDuplicateInList = (list, entry) => {
    const beamIdx = list.findIndex(b => b.beam_name.trim().toLowerCase() === (entry.beam_name || '').trim().toLowerCase());
    if (beamIdx < 0) return null;
    const existingCombos = list[beamIdx].combinations;
    const entryColorKey = (entry.colors || []).map(c => `${c.f_number}:${c.color_name}`).sort().join('|').toLowerCase();

    const dupIdx = existingCombos.findIndex(combo => {
      const comboNameMatch = (combo.combination_name || '').trim().toLowerCase() === (entry.combination_name || '').trim().toLowerCase();
      const comboColorKey = (combo.colors || []).map(c => `${c.f_number}:${c.color_name}`).sort().join('|').toLowerCase();
      return comboNameMatch && comboColorKey === entryColorKey;
    });

    if (dupIdx >= 0) return { beamIdx, comboIdx: dupIdx };
    return null;
  };

  const handleStartImport = async () => {
    const checkedEntries = parsedEntries.filter((_, idx) => selectedPreviewRows.includes(idx));
    if (checkedEntries.length === 0) {
      setSnack('No entries selected to import.');
      return;
    }

    // Mismatch check: if any of the checked entries has a different series base from the form's series base
    if (seriesBase) {
      const targetBase = seriesBase.trim().toUpperCase();
      const mismatch = checkedEntries.find(e => e.series_base && e.series_base.trim().toUpperCase() !== targetBase);
      if (mismatch) {
        setMismatchEntry(mismatch);
        return;
      }
    }

    // Level 4: WhatsApp Import Validation: check database for duplicate series codes
    setLoading(true);
    setError('');
    const existSareeCheckQueue = [];
    const processedCodes = new Set();

    try {
      for (const entry of checkedEntries) {
        const code = (entry.series_code || '').toUpperCase();
        if (code && !processedCodes.has(code)) {
          processedCodes.add(code);
          const { data } = await sareeAPI.getAll({ search: code });
          const exactMatch = (data.sarees || []).find(s => s.series_code.toUpperCase() === code);
          if (exactMatch) {
            existSareeCheckQueue.push({
              seriesCode: code,
              sareeId: exactMatch.id,
              entry
            });
          }
        }
      }

      setLoading(false);

      if (existSareeCheckQueue.length > 0) {
        setSareeExistQueue(existSareeCheckQueue);
        setActiveSareeExist(existSareeCheckQueue[0]);
        setPreviewOpen(false); // Close preview to show conflict resolver
        return;
      }

      proceedWithCombinationImport(checkedEntries);
    } catch (err) {
      setLoading(false);
      setError('Failed to check database for duplicate series codes.');
    }
  };

  const proceedWithCombinationImport = (checkedEntries) => {
    const duplicates = [];
    const newEntries = [];

    checkedEntries.forEach(entry => {
      const dup = detectDuplicate(entry);
      if (dup) {
        duplicates.push({ entry, dupInfo: dup });
      } else {
        newEntries.push(entry);
      }
    });

    if (duplicates.length > 0) {
      setImportAccumulator(newEntries);
      setDupQueue(duplicates);
      setActiveDup(duplicates[0]);
      setPreviewOpen(false); // Close preview to handle duplicates
    } else {
      executeFinalImport(checkedEntries);
    }
  };

  const executeFinalImport = (entriesToImport) => {
    let updated = [...beams];
    // Remove empty default beam if it has no real data
    if (updated.length === 1 && !updated[0].beam_name && updated[0].combinations.length === 1 && !updated[0].combinations[0].colors[0]?.color_name) {
      updated = [];
    }

    for (const entry of entriesToImport) {
      if (!isEdit && entry.series_base) {
        setSeriesBase(entry.series_base);
        setSeriesLetter(entry.series_letter || 'A');
      }

      const targetCombo = {
        combination_name: entry.combination_name || '',
        current_stock: entry.stock || 0,
        notes: '',
        colors: entry.colors.length > 0 ? entry.colors : [{ f_number: 'F-1', color_name: '', company_name: '' }]
      };

      if (entry.beam_name) {
        const existingIdx = updated.findIndex(b => b.beam_name.toLowerCase() === entry.beam_name.toLowerCase());
        if (existingIdx >= 0) {
          if (entry.importMode === 'update') {
            const dupInfo = detectDuplicateInList(updated, entry);
            if (dupInfo) {
              updated[dupInfo.beamIdx].combinations[dupInfo.comboIdx] = targetCombo;
              continue;
            }
          }
          updated[existingIdx].combinations.push(targetCombo);
        } else {
          updated.push({ beam_name: entry.beam_name, combinations: [targetCombo] });
        }
      } else {
        if (updated.length === 0) updated.push({ beam_name: '', combinations: [] });
        updated[0].combinations.push(targetCombo);
      }
    }

    setBeams(updated.length > 0 ? updated : [{ beam_name: '', combinations: [newCombo()] }]);
    setPreviewOpen(false);
    setParsedEntries([]);
    setSelectedPreviewRows([]);
    setPasteText('');
    setSnack('WhatsApp message imported successfully!');
  };

  const handleResolveDuplicate = (resolution) => {
    const resolvedEntry = { ...activeDup.entry };
    let newAccumulator = [...importAccumulator];

    if (resolution === 'update') {
      resolvedEntry.importMode = 'update';
      newAccumulator.push(resolvedEntry);
    } else if (resolution === 'duplicate') {
      resolvedEntry.importMode = 'duplicate';
      newAccumulator.push(resolvedEntry);
    } // If 'skip', we just drop it from accumulator

    const remaining = dupQueue.slice(1);
    if (remaining.length > 0) {
      setImportAccumulator(newAccumulator);
      setDupQueue(remaining);
      setActiveDup(remaining[0]);
    } else {
      executeFinalImport(newAccumulator);
      setDupQueue([]);
      setActiveDup(null);
      setImportAccumulator([]);
    }
  };

  const handleResolveSareeExist = (resolution) => {
    const currentConflict = activeSareeExist;
    const remaining = sareeExistQueue.slice(1);

    // Filter parsed entries for skip mode
    const filteredParsed = parsedEntries.filter(entry =>
      (entry.series_code || '').toUpperCase() !== currentConflict.seriesCode
    );

    if (resolution === 'skip') {
      setParsedEntries(filteredParsed);
      setSelectedPreviewRows([]);

      if (remaining.length > 0) {
        setSareeExistQueue(remaining);
        setActiveSareeExist(remaining[0]);
      } else {
        // finished checking saree existence.
        const keptChecked = filteredParsed.filter(entry =>
          selectedPreviewRows.includes(parsedEntries.indexOf(entry))
        );
        setActiveSareeExist(null);
        setSareeExistQueue([]);
        proceedWithCombinationImport(keptChecked);
      }
    } else if (resolution === 'open') {
      setActiveSareeExist(null);
      setSareeExistQueue([]);
      navigate(`/sarees/${currentConflict.sareeId}`);
    } else if (resolution === 'update') {
      const entriesToMerge = parsedEntries.filter(entry =>
        (entry.series_code || '').toUpperCase() === currentConflict.seriesCode
      );
      sessionStorage.setItem('pending_whatsapp_import', JSON.stringify(entriesToMerge));
      setActiveSareeExist(null);
      setSareeExistQueue([]);
      navigate(`/sarees/edit/${currentConflict.sareeId}`);
    }
  };

  // ── Image upload ──────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try { const { data } = await uploadAPI.image(file); setImageUrl(data.url); }
    catch (err) { setError(err.response?.data?.error || 'Upload failed'); }
    finally { setUploading(false); }
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!seriesBase.trim()) { setError('Series base is required'); return; }

    const targetSeriesCode = (seriesBase.trim() + seriesLetter.trim()).toUpperCase();

    // Check duplicate beam names locally
    const beamNames = beams.map(b => b.beam_name.trim().toLowerCase());
    const dupBeamIdx = beamNames.findIndex((name, idx) => name && beamNames.indexOf(name) !== idx);
    if (dupBeamIdx >= 0) {
      setError(`"${beams[dupBeamIdx].beam_name}" already exists for this sari.`);
      return;
    }

    // Check duplicate color F numbers locally
    for (let bi = 0; bi < beams.length; bi++) {
      const b = beams[bi];
      for (let ci = 0; ci < (b.combinations || []).length; ci++) {
        const c = b.combinations[ci];
        const fNums = (c.colors || []).map(col => col.f_number.trim().toUpperCase());
        const dupColorIdx = fNums.findIndex((f, idx) => f && fNums.indexOf(f) !== idx);
        if (dupColorIdx >= 0) {
          setError(`"${c.colors[dupColorIdx].f_number}" already exists in this combination.`);
          return;
        }
      }
    }

    setLoading(true); setError('');
    try {
      // Check database for duplicate Series Code (Level 1)
      let shouldCheckDb = !isEdit;
      if (isEdit) {
        const { data: orig } = await sareeAPI.getById(id);
        if (orig.saree.series_code.toUpperCase() !== targetSeriesCode) {
          shouldCheckDb = true;
        }
      }

      if (shouldCheckDb) {
        const { data } = await sareeAPI.getAll({ search: targetSeriesCode });
        const exactMatch = (data.sarees || []).find(s => s.series_code.toUpperCase() === targetSeriesCode);
        if (exactMatch) {
          setDupSeriesCode(targetSeriesCode);
          setDupSareeId(exactMatch.id);
          setSareeDupOpen(true);
          setLoading(false);
          setSeriesCodeError(true);
          return;
        }
      }

      const cleanedBeams = beams.map(b => ({
        ...b,
        combinations: b.combinations.map((c, ci) => ({
          ...c,
          combination_name: `Combination ${ci + 1}`
        }))
      }));

      const payload = { series_base: seriesBase, series_letter: seriesLetter, sari_name: sariName, price: price !== '' ? price : null, description, image_url: imageUrl, brand, beams: cleanedBeams };
      if (isEdit) await sareeAPI.update(id, payload);
      else await sareeAPI.create(payload);
      navigate('/sarees');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={() => navigate('/sarees')} color="primary"><ArrowBack /></IconButton>
        <Box flex={1}>
          <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {isEdit ? 'Edit Saree' : 'Add New Saree'}
          </Typography>
          <Typography variant="body2" color="text.secondary">Hierarchical: Saree → Beams → Combinations → F-Colors</Typography>
        </Box>
        <Button startIcon={<WhatsAppIcon />} variant="outlined" color="success" onClick={() => setPasteOpen(true)}>
          Paste WhatsApp
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Left panel */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Saree identity */}
            <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Saree Identity</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 2.5 }}>
                  <TextField fullWidth label="Series Base" placeholder="KS008" value={seriesBase}
                    error={seriesCodeError}
                    helperText={seriesCodeError ? 'Duplicate Series Code' : ''}
                    onChange={e => { setSeriesBase(e.target.value.toUpperCase()); setSeriesCodeError(false); }} required />
                </Grid>
                <Grid size={{ xs: 6, sm: 1.5 }}>
                  <TextField fullWidth label="Letter" placeholder="C" value={seriesLetter}
                    error={seriesCodeError}
                    onChange={e => { setSeriesLetter(e.target.value.toUpperCase()); setSeriesCodeError(false); }} slotProps={{ htmlInput: { maxLength: 2 } }} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Brand</InputLabel>
                    <Select value={brand} label="Brand" onChange={e => setBrand(e.target.value)}>
                      <MenuItem value="KP">KP</MenuItem>
                      <MenuItem value="KPR">KPR</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField fullWidth label="Sari Name (optional)" placeholder="White Beam Series" value={sariName}
                    onChange={e => setSariName(e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField fullWidth type="number" label="Price (₹)" value={price}
                    onChange={e => setPrice(e.target.value)}
                    slotProps={{
                      htmlInput: { min: 0, step: '0.01' },
                      input: { startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> }
                    }} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth multiline rows={2} label="Description" value={description}
                    onChange={e => setDescription(e.target.value)} />
                </Grid>
              </Grid>
            </Paper>

            {/* Beams */}
            <Paper sx={{ p: 3, borderRadius: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Beams & Combinations</Typography>
                <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={addBeam}>Add Beam</Button>
              </Box>

              {beams.map((beam, bi) => {
                const isDupBeam = beams.some((b, idx) => idx !== bi && b.beam_name.trim().toLowerCase() === beam.beam_name.trim().toLowerCase());
                return (
                  <Accordion key={bi} defaultExpanded sx={{ mb: 2, borderRadius: '12px !important', '&:before': { display: 'none' }, border: '1px solid', borderColor: isDupBeam ? 'error.main' : 'divider' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'action.hover', borderRadius: '12px 12px 0 0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, mr: 1 }}>
                        <TextField
                          size="small" placeholder="Beam Name (e.g. White Beam)" value={beam.beam_name}
                          error={isDupBeam}
                          helperText={isDupBeam ? 'Duplicate Beam Name' : ''}
                          onChange={e => { e.stopPropagation(); updateBeamName(bi, e.target.value); }}
                          onClick={e => e.stopPropagation()} sx={{ flex: 1 }} required
                        />
                        <Chip size="small" label={`${beam.combinations.length} combo${beam.combinations.length !== 1 ? 's' : ''}`} />
                        {beams.length > 1 && (
                          <IconButton component="span" size="small" color="error" onClick={e => { e.stopPropagation(); removeBeam(bi); }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 2 }}>
                      {beam.combinations.map((combo, ci) => (
                        <CombinationCard key={ci} combo={combo} comboIndex={ci}
                          onUpdate={(idx, updated) => updateCombo(bi, idx, updated)}
                          onRemove={(idx) => removeCombo(bi, idx)}
                          onDuplicate={(idx) => duplicateCombo(bi, idx)}
                        />
                      ))}
                      <Button startIcon={<AddIcon />} size="small" variant="dashed" onClick={() => addCombo(bi)}>
                        Add Combination
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Paper>
          </Grid>

          {/* Right panel */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 4, mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Product Image</Typography>
              {imageUrl && <Box component="img" src={imageUrl} alt="preview" sx={{ width: '100%', borderRadius: 2, mb: 1.5, objectFit: 'cover', maxHeight: 200 }} />}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
              <Button fullWidth variant="outlined" startIcon={uploading ? <CircularProgress size={18} /> : <CloudUpload />}
                onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button fullWidth variant="outlined" onClick={() => navigate('/sarees')} disabled={loading}>Cancel</Button>
              <Button fullWidth variant="contained" type="submit" disabled={loading || uploading} sx={{ py: 1.5 }}>
                {loading ? 'Saving...' : 'Save Saree'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* WhatsApp Paste Dialog */}
      <Dialog open={pasteOpen} onClose={() => setPasteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <WhatsAppIcon color="success" /> Paste WhatsApp Message
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste your WhatsApp message (single or multiple entries). We'll extract beam, series code, F-colors, and stock automatically.
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
              {`BLACK Beam:\nKS526C (Delivery)\nF-1: Red\nF-2: Normal Chempiyan\n51 pcs/-`}
            </Typography>
          </Paper>
          <TextField multiline rows={10} fullWidth label="Paste message here" value={pasteText}
            onChange={e => setPasteText(e.target.value)} placeholder="Paste one or more WhatsApp entries..." autoFocus />
          {parseError && <Alert severity="error" sx={{ mt: 1.5 }}>{parseError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPasteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleParse} disabled={!pasteText.trim()}>
            Parse & Preview
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.4rem' }}>📋 Import Preview — {parsedEntries.length} {parsedEntries.length === 1 ? 'Entry' : 'Entries'}</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {parseWarnings.length > 0 && (
            <Box sx={{ p: 2 }}>
              <Alert severity="warning">
                {parseWarnings.map((w, i) => <Typography key={i} variant="body2">{w}</Typography>)}
              </Alert>
            </Box>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={parsedEntries.length > 0 && selectedPreviewRows.length === parsedEntries.length}
                      indeterminate={selectedPreviewRows.length > 0 && selectedPreviewRows.length < parsedEntries.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPreviewRows(parsedEntries.map((_, i) => i));
                        else setSelectedPreviewRows([]);
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Beam</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Series Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Combination Name</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Stock</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Colors</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedEntries.map((entry, index) => {
                  const isChecked = selectedPreviewRows.includes(index);
                  const isDup = detectDuplicate(entry) !== null;
                  return (
                    <TableRow key={index} hover selected={isChecked}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) setSelectedPreviewRows(selectedPreviewRows.filter(i => i !== index));
                            else setSelectedPreviewRows([...selectedPreviewRows, index]);
                          }}
                        />
                      </TableCell>
                      <TableCell>{entry.beam_name || '—'}</TableCell>
                      <TableCell>{entry.series_code || '—'}</TableCell>
                      <TableCell>{entry.combination_name || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{entry.stock ?? '—'} pcs</TableCell>
                      <TableCell align="right">{entry.colors?.length || 0}</TableCell>
                      <TableCell>
                        {isDup ? (
                          <Chip label="Already exists" size="small" color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
                        ) : (
                          <Chip label="New" size="small" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setPreviewOpen(false)} variant="outlined">Cancel</Button>
          <Button variant="contained" color="success" onClick={handleStartImport} disabled={selectedPreviewRows.length === 0}>
            Import Checked ({selectedPreviewRows.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Resolution Dialog */}
      <Dialog open={!!activeDup} onClose={() => { setActiveDup(null); setDupQueue([]); }} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', pb: 1 }}>This combination already exists.</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Beam: <strong>{activeDup?.entry?.beam_name}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Series Code: <strong>{activeDup?.entry?.series_code}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Combination Name: <strong>{activeDup?.entry?.combination_name || '—'}</strong>
            </Typography>
            <Typography variant="body2">
              Stock: <strong>{activeDup?.entry?.stock ?? 0} pcs</strong>
            </Typography>
          </Box>
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
            How would you like to handle this duplicate entry?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button fullWidth variant="contained" color="primary" onClick={() => handleResolveDuplicate('update')} sx={{ py: 1 }}>
            Update Existing
          </Button>
          <Button fullWidth variant="outlined" color="success" onClick={() => handleResolveDuplicate('duplicate')} sx={{ py: 1 }}>
            Create Duplicate
          </Button>
          <Box sx={{ display: 'flex', width: '100%', gap: 1, mt: 0.5 }}>
            <Button fullWidth variant="outlined" onClick={() => handleResolveDuplicate('skip')}>
              Skip
            </Button>
            <Button fullWidth variant="text" color="error" onClick={() => { setActiveDup(null); setDupQueue([]); }}>
              Cancel
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Mismatch Warning Dialog */}
      <Dialog open={!!mismatchEntry} onClose={() => setMismatchEntry(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>⚠️ Wrong Saree Detected</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            This WhatsApp message belongs to sari <strong>{mismatchEntry?.series_code}</strong>.
            You are currently editing <strong>{seriesBase}{seriesLetter}</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please open the correct sari before importing.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMismatchEntry(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => { setMismatchEntry(null); navigate('/sarees'); }}>
            Go to Sarees
          </Button>
        </DialogActions>
      </Dialog>

      {/* Level 1: Saree Duplicate Dialog */}
      <Dialog open={sareeDupOpen} onClose={() => setSareeDupOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>This sari ({dupSeriesCode}) already exists.</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            A saree with the series code <strong>{dupSeriesCode}</strong> already exists in the system. Duplicates are not allowed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSareeDupOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { setSareeDupOpen(false); navigate(`/sarees/${dupSareeId}`); }}>
            Open Existing Sari
          </Button>
        </DialogActions>
      </Dialog>

      {/* Level 4: WhatsApp Import Duplicate Saree Dialog */}
      <Dialog
        open={!!activeSareeExist}
        onClose={() => { setActiveSareeExist(null); setSareeExistQueue([]); }}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', pb: 1 }}>
          {activeSareeExist?.seriesCode} already exists in the system.
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            A saree with the series code <strong>{activeSareeExist?.seriesCode}</strong> is already registered. Duplicates are not allowed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button fullWidth variant="contained" color="primary" onClick={() => handleResolveSareeExist('update')} sx={{ py: 1 }}>
            Update Existing
          </Button>
          <Button fullWidth variant="outlined" color="info" onClick={() => handleResolveSareeExist('open')} sx={{ py: 1 }}>
            Open Existing
          </Button>
          <Box sx={{ display: 'flex', width: '100%', gap: 1, mt: 0.5 }}>
            <Button fullWidth variant="outlined" onClick={() => handleResolveSareeExist('skip')}>
              Skip
            </Button>
            <Button fullWidth variant="text" color="error" onClick={() => { setActiveSareeExist(null); setSareeExistQueue([]); }}>
              Cancel
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Blocked Entries Confirmation Dialog */}
      <Dialog
        open={blockedConfirmOpen}
        onClose={() => { setBlockedConfirmOpen(false); setPasteOpen(true); }}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 1 }}>
          ⚠️ Multiple Sarees Detected
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            You are currently working on saree <strong>{blockedConfirmData?.targetCode}</strong>.
            The message also contains entries for a <strong>different saree</strong> — listed below.
            These will be <strong>removed</strong> before import. Confirm to proceed.
          </Alert>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Entries that will be removed ({blockedConfirmData?.blockedEntries?.length}):
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'error.50' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Beam</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Series Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Stock</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Colors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(blockedConfirmData?.blockedEntries || []).map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell>{entry.beam_name || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={entry.series_code || '—'}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="error.main">
                        Belongs to <strong>{entry.series_code}</strong>, not <strong>{blockedConfirmData?.targetCode}</strong>
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{entry.stock ?? '—'} pcs</TableCell>
                    <TableCell align="right">{entry.colors?.length || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="body2" color="text.secondary">
            <strong>{blockedConfirmData?.allowedEntries?.length || 0}</strong> entr{(blockedConfirmData?.allowedEntries?.length || 0) === 1 ? 'y' : 'ies'} for <strong>{blockedConfirmData?.targetCode}</strong> will still be imported.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => { setBlockedConfirmOpen(false); setPasteOpen(true); }}
          >
            Go Back
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmFilterAndProceed}
            disabled={!blockedConfirmData?.allowedEntries?.length}
          >
            Yes, Remove Them & Import {blockedConfirmData?.targetCode} Only
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Blocks Confirmation Dialog */}
      <Dialog
        open={dupConfirmOpen}
        onClose={() => { setDupConfirmOpen(false); setPasteOpen(true); }}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 1 }}>
          🔁 Duplicate Entries Found
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            The pasted message contains <strong>{dupConfirmData?.duplicateEntries?.length}</strong> block{dupConfirmData?.duplicateEntries?.length === 1 ? '' : 's'} that are
            exact copies of other entries in the same message. They are listed below with the reason.
            Confirm to remove them and continue with only the unique entries.
          </Alert>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Entries that will be removed ({dupConfirmData?.duplicateEntries?.length}):
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Beam</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Series Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>F-Colors</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Stock</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason (Why Removed)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(dupConfirmData?.duplicateEntries || []).map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.entry.beam_name || '—'}</TableCell>
                    <TableCell>
                      <Chip label={item.entry.series_code || '—'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {(item.entry.colors || []).map(c => `${c.f_number}: ${c.color_name}`).join(', ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{item.entry.stock ?? '—'} pcs</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="warning.dark">
                        Exact copy of <strong>Entry #{item.duplicateOf.entryNumber}</strong>
                        {item.duplicateOf.colorSummary ? ` (${item.duplicateOf.colorSummary})` : ''}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="body2" color="text.secondary">
            <strong>{dupConfirmData?.uniqueEntries?.length}</strong> unique entr{dupConfirmData?.uniqueEntries?.length === 1 ? 'y' : 'ies'} will proceed to import after removal.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => { setDupConfirmOpen(false); setPasteOpen(true); }}
          >
            Go Back
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={confirmDedupAndProceed}
          >
            Yes, Remove Duplicates & Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* All Detected Sarees Already Exist Dialog */}
      <Dialog
        open={allSareesExistOpen}
        onClose={() => { setAllSareesExistOpen(false); setPasteOpen(true); }}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
          ⚠️ All Detected Sarees Already Exist
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            All sarees found in this message are already in your inventory. No new saree can be created.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Detected codes:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {allSareesExistCodes.map(code => (
              <Chip key={code} label={code} size="small" color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => { setAllSareesExistOpen(false); setPasteOpen(true); }}>
            Go Back
          </Button>
          <Button variant="contained" onClick={() => { setAllSareesExistOpen(false); navigate('/sarees'); }}>
            View All Sarees
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
};

export default SareeForm;
