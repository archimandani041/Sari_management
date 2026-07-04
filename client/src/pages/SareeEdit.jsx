/**
 * SareeEdit — Advanced Edit Page (V2 Hierarchical)
 * Beam accordions → Combination cards → Inline F-color editing
 * Full ERP-style editing with unsaved change detection
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sareeAPI, beamAPI, combinationAPI, parserAPI } from '../services/api';
import {
  Box, Paper, TextField, Button, Typography, Grid, IconButton,
  Divider, Alert, CircularProgress, Chip, Accordion, AccordionSummary,
  AccordionDetails, Tooltip, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Badge, InputAdornment,
  Collapse, LinearProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';


// ─────────────────────────────────────────────────────
// F-Color Row inside combination
// ─────────────────────────────────────────────────────
const ColorRow = ({ color, index, onChange, onRemove, disabled, isDuplicate }) => (
  <Grid container spacing={1.5} sx={{ mb: 1, alignItems: 'center' }}>
    <Grid size={{ xs: 3, sm: 2 }}>
      <TextField size="small" fullWidth label="F #" value={color.f_number}
        error={isDuplicate}
        helperText={isDuplicate ? 'Dup' : ''}
        onChange={e => onChange(index, 'f_number', e.target.value)} disabled={disabled} />
    </Grid>
    <Grid size={{ xs: 5, sm: 5 }}>
      <TextField size="small" fullWidth label="Color" value={color.color_name}
        onChange={e => onChange(index, 'color_name', e.target.value)} required disabled={disabled} />
    </Grid>
    <Grid size={{ xs: 3, sm: 4 }}>
      <TextField size="small" fullWidth label="Company (opt)" value={color.company_name || ''}
        onChange={e => onChange(index, 'company_name', e.target.value)} disabled={disabled} />
    </Grid>
    <Grid size={{ xs: 1, sm: 1 }}>
      <IconButton size="small" color="error" onClick={() => onRemove(index)} disabled={disabled}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Grid>
  </Grid>
);

// ─────────────────────────────────────────────────────
// Combination Card — independently saveable
// ─────────────────────────────────────────────────────
const CombinationCard = ({ combo: initialCombo, comboIndex, beamName, sareeId, onSaved, onDeleted }) => {
  const [combo, setCombo] = useState(JSON.parse(JSON.stringify(initialCombo)));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [snack, setSnack] = useState('');

  useEffect(() => { setCombo(JSON.parse(JSON.stringify(initialCombo))); setDirty(false); }, [initialCombo]);

  const update = (field, val) => { setCombo(c => ({ ...c, [field]: val })); setDirty(true); };
  const updateColor = (ci, field, val) => {
    const colors = [...combo.colors]; colors[ci] = { ...colors[ci], [field]: val };
    setCombo(c => ({ ...c, colors })); setDirty(true);
  };
  const addColor = () => {
    const n = combo.colors.length + 1;
    setCombo(c => ({ ...c, colors: [...c.colors, { f_number: `F-${n}`, color_name: '', company_name: '' }] }));
    setDirty(true);
  };
  const removeColor = (ci) => { setCombo(c => ({ ...c, colors: c.colors.filter((_, i) => i !== ci) })); setDirty(true); };

  const handleDuplicate = () => {
    const clone = JSON.parse(JSON.stringify(combo));
    clone.id = undefined;
    clone.combination_name = '';
    clone.current_stock = 0;
    onSaved({ action: 'duplicate', combo: clone, beamId: initialCombo.beam_id });
  };

  const handleSave = async () => {
    // Check locally for duplicate colors before saving
    const fNums = combo.colors.map(col => col.f_number.trim().toUpperCase());
    const dupF = combo.colors.find((col, idx) => fNums.indexOf(col.f_number.trim().toUpperCase()) !== idx)?.f_number;
    if (dupF) {
      setSnack(`"${dupF}" already exists in this combination.`);
      return;
    }

    setSaving(true);
    try {
      const { data } = await combinationAPI.update(combo.id, {
        combination_name: `Combination ${comboIndex + 1}`,
        current_stock: parseInt(combo.current_stock) || 0,
        minimum_stock: parseInt(combo.minimum_stock) || 20,
        notes: combo.notes,
        colors: combo.colors,
        status: combo.status,
        brand: combo.brand,
        reason: `Updated via Edit page`
      });
      setDirty(false);
      setSnack('Combination saved!');
      onSaved({ action: 'updated', combo: data.combination });
    } catch (e) {
      setSnack('Save failed: ' + (e.response?.data?.error || 'Unknown error'));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDelConfirm(false); setSaving(true);
    try {
      await combinationAPI.delete(combo.id);
      onDeleted(combo.id);
    } catch (e) { setSnack('Delete failed'); setSaving(false); }
  };

  const colorSummary = combo.colors.map(c => c.color_name).filter(Boolean).join(', ');

  return (
    <Paper variant="outlined" sx={{
      mb: 2, borderRadius: 2,
      border: dirty ? '1.5px solid' : '1px solid',
      borderColor: dirty ? 'warning.main' : 'divider',
      transition: 'border-color 0.2s'
    }}>
      {saving && <LinearProgress />}
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small" color={dirty ? 'warning' : 'default'} variant="outlined"
              label={`Combination ${comboIndex + 1}`}
              icon={dirty ? <WarningIcon /> : undefined}
            />
            {colorSummary && <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 240 }}>{colorSummary}</Typography>}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip size="small" label={`${combo.current_stock} pcs`} color="primary" />
            <Tooltip title="Duplicate"><IconButton size="small" onClick={handleDuplicate} disabled={saving}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete Combination"><IconButton size="small" color="error" onClick={() => setDelConfirm(true)} disabled={saving}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Box>
        </Box>

        {/* Fields */}
        <Grid container spacing={2} sx={{ mb: 1.5 }}>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField size="small" fullWidth type="number" label="Current Stock" value={combo.current_stock}
              onChange={e => update('current_stock', e.target.value)} disabled={saving} slotProps={{ htmlInput: { min: 0 } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField size="small" fullWidth type="number" label="Min Stock Alert" value={combo.minimum_stock || 20}
              onChange={e => update('minimum_stock', e.target.value)} disabled={saving} slotProps={{ htmlInput: { min: 0 } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.5 }}>
            <FormControl fullWidth size="small" disabled={saving}>
              <InputLabel>Status</InputLabel>
              <Select
                value={combo.status || 'In Stock'}
                label="Status"
                onChange={e => update('status', e.target.value)}
              >
                <MenuItem value="In Stock">In Stock</MenuItem>
                <MenuItem value="In Delivery">In Delivery</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 2.5 }}>
            <FormControl fullWidth size="small" disabled={saving}>
              <InputLabel>Brand</InputLabel>
              <Select
                value={combo.brand || 'KP'}
                label="Brand"
                onChange={e => update('brand', e.target.value)}
              >
                <MenuItem value="KP">KP</MenuItem>
                <MenuItem value="KPR">KPR</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField size="small" fullWidth label="Notes" value={combo.notes || ''}
              onChange={e => update('notes', e.target.value)} disabled={saving} />
          </Grid>
        </Grid>

        {/* F-Colors */}
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block' }}>F-Colors</Typography>
        {combo.colors.map((color, ci) => {
          const isDuplicateColor = combo.colors.some((c, idx) => idx !== ci && c.f_number.trim().toUpperCase() === color.f_number.trim().toUpperCase());
          return (
            <ColorRow key={ci} color={color} index={ci} onChange={updateColor} onRemove={removeColor} disabled={saving} isDuplicate={isDuplicateColor} />
          );
        })}
        <Button size="small" startIcon={<AddIcon />} onClick={addColor} disabled={saving} sx={{ mt: 0.5, mb: 1 }}>
          Add Color
        </Button>



        {/* Save/Cancel actions */}
        {dirty && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button size="small" variant="outlined" startIcon={<CancelIcon />}
              onClick={() => { setCombo(JSON.parse(JSON.stringify(initialCombo))); setDirty(false); }} disabled={saving}>
              Discard
            </Button>
          </Box>
        )}
      </Box>

      {/* Delete confirm */}
      <Dialog open={delConfirm} onClose={() => setDelConfirm(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Combination?</DialogTitle>
        <DialogContent><DialogContentText>This will permanently delete this combination and all its stock history. Cannot be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDelConfirm(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Paper>
  );
};

// ─────────────────────────────────────────────────────
// Beam Section
// ─────────────────────────────────────────────────────
const BeamSection = ({ beam: initialBeam, sareeId, onBeamUpdated, onBeamDeleted }) => {
  const [beamName, setBeamName] = useState(initialBeam.beam_name);
  const [nameDirty, setNameDirty] = useState(false);
  const [combinations, setCombinations] = useState(initialBeam.combinations || []);
  const [savingName, setSavingName] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [addingCombo, setAddingCombo] = useState(false);
  const [snack, setSnack] = useState('');

  useEffect(() => { setBeamName(initialBeam.beam_name); setCombinations(initialBeam.combinations || []); }, [initialBeam]);

  const handleSaveBeamName = async () => {
    if (!beamName.trim()) return;
    setSavingName(true);
    try {
      await beamAPI.update(initialBeam.id, { beam_name: beamName.trim() });
      setNameDirty(false);
      setSnack(`Beam renamed to "${beamName}"`);
      onBeamUpdated({ ...initialBeam, beam_name: beamName.trim() });
    } catch (e) { setSnack(e.response?.data?.error || 'Rename failed'); }
    finally { setSavingName(false); }
  };

  const handleDeleteBeam = async () => {
    setDelConfirm(false);
    try {
      await beamAPI.delete(initialBeam.id);
      onBeamDeleted(initialBeam.id);
    } catch (e) { setSnack('Delete failed'); }
  };

  const handleAddCombo = async () => {
    setAddingCombo(true);
    try {
      const { data } = await combinationAPI.add(initialBeam.id, {
        combination_name: '', current_stock: 0, minimum_stock: 20, status: 'In Stock', brand: 'KP', colors: [{ f_number: 'F-1', color_name: '', company_name: '' }]
      });
      const nc = { ...data.combination, beam_id: initialBeam.id, colors: data.combination.combination_colors || [] };
      setCombinations(prev => [...prev, nc]);
      setSnack('New combination added');
    } catch (e) { setSnack(e.response?.data?.error || 'Failed to add combination'); }
    finally { setAddingCombo(false); }
  };

  const handleCombinationSaved = async ({ action, combo, beamId }) => {
    if (action === 'updated') {
      setCombinations(prev => prev.map(c => c.id === combo.id ? { ...combo, colors: combo.combination_colors || combo.colors || [] } : c));
    } else if (action === 'duplicate') {
      setAddingCombo(true);
      try {
        const { data } = await combinationAPI.add(beamId || initialBeam.id, {
          combination_name: combo.combination_name,
          current_stock: combo.current_stock,
          minimum_stock: combo.minimum_stock || 20,
          notes: combo.notes,
          status: combo.status || 'In Stock',
          brand: combo.brand || 'KP',
          colors: combo.colors
        });
        const nc = { ...data.combination, beam_id: initialBeam.id, colors: data.combination.combination_colors || [] };
        setCombinations(prev => [...prev, nc]);
        setSnack('Combination duplicated');
      } catch (e) { setSnack(e.response?.data?.error || 'Duplicate failed'); }
      finally { setAddingCombo(false); }
    }
  };

  const handleCombinationDeleted = (id) => {
    setCombinations(prev => prev.filter(c => c.id !== id));
    setSnack('Combination deleted');
  };

  const totalStock = combinations.reduce((s, c) => s + (c.current_stock || 0), 0);

  return (
    <Accordion defaultExpanded sx={{ mb: 2, borderRadius: '12px !important', '&:before': { display: 'none' }, border: '1px solid', borderColor: 'primary.light', overflow: 'hidden' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'primary.main', color: '#fff', '& .MuiAccordionSummary-expandIconWrapper': { color: '#fff' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, mr: 1 }}>
          <Chip label={`${combinations.length} combos`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
          <Chip label={`${totalStock} pcs total`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
          <Typography sx={{ fontWeight: 700, flex: 1 }}>{beamName || 'Unnamed Beam'}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2.5 }}>
        {/* Beam name edit */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, alignItems: 'center' }}>
          <TextField size="small" label="Beam Name" value={beamName}
            onChange={e => { setBeamName(e.target.value); setNameDirty(true); }}
            sx={{ flex: 1 }} disabled={savingName} />
          {nameDirty && (
            <>
              <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSaveBeamName} disabled={savingName}>
                {savingName ? 'Saving...' : 'Save Name'}
              </Button>
              <Button size="small" variant="outlined" onClick={() => { setBeamName(initialBeam.beam_name); setNameDirty(false); }}>
                Cancel
              </Button>
            </>
          )}
          <Tooltip title="Delete this entire beam and all its combinations">
            <IconButton color="error" onClick={() => setDelConfirm(true)} disabled={savingName}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Combinations */}
        {combinations.map((combo, idx) => (
          <CombinationCard
            key={combo.id}
            comboIndex={idx}
            combo={{ ...combo, colors: combo.combination_colors || combo.colors || [] }}
            beamName={beamName}
            sareeId={sareeId}
            onSaved={handleCombinationSaved}
            onDeleted={handleCombinationDeleted}
          />
        ))}

        <Button startIcon={addingCombo ? <CircularProgress size={16} /> : <AddIcon />}
          variant="outlined" onClick={handleAddCombo} disabled={addingCombo} fullWidth sx={{ mt: 1 }}>
          {addingCombo ? 'Adding...' : 'Add New Combination'}
        </Button>
      </AccordionDetails>

      <Dialog open={delConfirm} onClose={() => setDelConfirm(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Beam "{beamName}"?</DialogTitle>
        <DialogContent><DialogContentText>This will permanently delete this beam and ALL its combinations and stock history.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDelConfirm(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteBeam}>Delete Beam</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Accordion>
  );
};

// ─────────────────────────────────────────────────────
// Main Edit Page
// ─────────────────────────────────────────────────────
const SareeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [saree, setSaree] = useState(null);
  const [beams, setBeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [addingBeam, setAddingBeam] = useState(false);
  const [newBeamName, setNewBeamName] = useState('');
  const [addBeamOpen, setAddBeamOpen] = useState(false);

  // Top-level saree fields
  const [seriesBase, setSeriesBase] = useState('');
  const [seriesLetter, setSeriesLetter] = useState('');
  const [sariName, setSariName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [topDirty, setTopDirty] = useState(false);
  const [savingTop, setSavingTop] = useState(false);

  // WhatsApp paste states
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

  // Blocked-entries confirmation dialog
  const [blockedConfirmOpen, setBlockedConfirmOpen] = useState(false);
  const [blockedConfirmData, setBlockedConfirmData] = useState(null);

  // Duplicate-entries confirmation dialog
  const [dupConfirmOpen, setDupConfirmOpen] = useState(false);
  const [dupConfirmData, setDupConfirmData] = useState(null);

  // Check for duplicate combo (Same Beam + Same Combination Name + Same F Colors)
  const detectDuplicate = useCallback((entry) => {
    const targetBase = seriesBase.trim().toUpperCase();
    const entryBase = (entry.series_base || '').trim().toUpperCase();
    if (entryBase && entryBase !== targetBase) {
      return null;
    }

    const beamIdx = beams.findIndex(b => b.beam_name.trim().toLowerCase() === (entry.beam_name || '').trim().toLowerCase());
    if (beamIdx < 0) return null;

    const existingCombos = beams[beamIdx].combinations || [];
    const entryColorKey = (entry.colors || []).map(c => `${c.f_number}:${c.color_name}`).sort().join('|').toLowerCase();

    const dupIdx = existingCombos.findIndex(combo => {
      const comboColors = combo.combination_colors || combo.colors || [];
      const comboColorKey = comboColors.map(c => `${c.f_number}:${c.color_name}`).sort().join('|').toLowerCase();
      return comboColorKey === entryColorKey;
    });

    if (dupIdx >= 0) {
      return { beamIdx, comboIdx: dupIdx, comboId: existingCombos[dupIdx].id };
    }
    return null;
  }, [beams, seriesBase]);

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
      if (duplicateEntries.length > 0) {
        setDupConfirmData({ uniqueEntries: allEntries, duplicateEntries, warnings });
        setDupConfirmOpen(true);
        setPasteOpen(false);
        return;
      }

      // ── Step 2: Single-saree enforcement (checking Series Base/Sari Number) ───────────────────────────
      const targetBase = seriesBase.trim()
        ? seriesBase.trim().toUpperCase()
        : (allEntries.find(e => e.series_base)?.series_base?.toUpperCase() ?? null);

      if (targetBase) {
        const allowedEntries = [];
        const blockedEntries = [];
        for (const e of allEntries) {
          const entryBase = (e.series_base || '').trim().toUpperCase();
          if (!entryBase || entryBase === targetBase) allowedEntries.push(e);
          else blockedEntries.push(e);
        }
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

      setParsedEntries(allEntries);
      setSelectedPreviewRows(allEntries.map((_, i) => i));
      setParseWarnings(warnings);
      setPreviewOpen(true);
      setPasteOpen(false);
    } catch (e) {
      setParseError(e.response?.data?.error || 'Could not parse message');
    }
  };

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

  const confirmDedupAndProceed = () => {
    if (!dupConfirmData) return;
    const { uniqueEntries, duplicateEntries, warnings } = dupConfirmData;
    const finalWarnings = [
      `${duplicateEntries.length} duplicate block${duplicateEntries.length === 1 ? '' : 's'} removed from the pasted message.`,
      ...warnings
    ];
    setDupConfirmOpen(false);
    setDupConfirmData(null);

    const targetBase = seriesBase.trim()
      ? seriesBase.trim().toUpperCase()
      : (uniqueEntries.find(e => e.series_base)?.series_base?.toUpperCase() ?? null);

    if (targetBase) {
      const allowedEntries = [];
      const blockedEntries = [];
      for (const e of uniqueEntries) {
        const entryBase = (e.series_base || '').trim().toUpperCase();
        if (!entryBase || entryBase === targetBase) allowedEntries.push(e);
        else blockedEntries.push(e);
      }
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

  const executeFinalImport = async (entriesToImport) => {
    setLoading(true);
    setError('');
    try {
      let currentBeams = [...beams];

      for (const entry of entriesToImport) {
        let beamId = null;
        const entryBeamName = (entry.beam_name || '').trim();

        // 1. Find or create Beam
        const existingBeam = currentBeams.find(b => b.beam_name.trim().toLowerCase() === entryBeamName.toLowerCase());
        if (existingBeam) {
          beamId = existingBeam.id;
        } else {
          const { data: newBeamData } = await beamAPI.add(id, { beam_name: entryBeamName || 'Unnamed Beam' });
          beamId = newBeamData.beam.id;
          const newBeam = { ...newBeamData.beam, combinations: [] };
          currentBeams.push(newBeam);
        }

        // 2. Prepare target combo
        const targetCombo = {
          combination_name: entry.combination_name || '',
          current_stock: entry.stock || 0,
          minimum_stock: 20,
          notes: '',
          colors: entry.colors && entry.colors.length > 0 ? entry.colors : [{ f_number: 'F-1', color_name: '', company_name: '' }]
        };

        // 3. Save combination (update or insert)
        if (entry.importMode === 'update') {
          const dupInfo = detectDuplicate(entry);
          if (dupInfo && dupInfo.comboId) {
            await combinationAPI.update(dupInfo.comboId, {
              combination_name: targetCombo.combination_name,
              current_stock: parseInt(targetCombo.current_stock) || 0,
              minimum_stock: parseInt(targetCombo.minimum_stock) || 20,
              notes: targetCombo.notes,
              colors: targetCombo.colors,
              reason: 'Updated via WhatsApp Import'
            });
            continue;
          }
        }

        await combinationAPI.add(beamId, {
          combination_name: targetCombo.combination_name,
          current_stock: targetCombo.current_stock,
          minimum_stock: targetCombo.minimum_stock,
          notes: targetCombo.notes,
          colors: targetCombo.colors
        });
      }

      setSnack('WhatsApp message imported successfully!');
      await load(); // Reload everything from server
    } catch (e) {
      console.error(e);
      setSnack('Import failed: ' + (e.response?.data?.error || 'Unknown error'));
    } finally {
      setLoading(false);
      setPreviewOpen(false);
      setParsedEntries([]);
      setSelectedPreviewRows([]);
      setPasteText('');
    }
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
    }

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

  const handleStartImport = () => {
    const checkedEntries = parsedEntries.filter((_, idx) => selectedPreviewRows.includes(idx));
    if (checkedEntries.length === 0) {
      setSnack('No entries selected to import.');
      return;
    }

    if (seriesBase) {
      const targetBase = seriesBase.trim().toUpperCase();
      const mismatch = checkedEntries.find(e => e.series_base && e.series_base.trim().toUpperCase() !== targetBase);
      if (mismatch) {
        setMismatchEntry(mismatch);
        return;
      }
    }

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
      setPreviewOpen(false);
    } else {
      executeFinalImport(checkedEntries);
    }
  };

  const load = useCallback(async () => {
    try {
      const { data } = await sareeAPI.getById(id);
      setSaree(data.saree);
      setBeams(data.saree.beams || []);
      setSeriesBase(data.saree.series_base);
      setSeriesLetter(data.saree.series_letter);
      setSariName(data.saree.sari_name || '');
      setPrice(data.saree.price != null ? String(data.saree.price) : '');
      setDescription(data.saree.description || '');
      // Top level status/brand removed
      setError('');
    } catch (e) {
      setError('Failed to load saree');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveTop = async () => {
    setSavingTop(true);
    try {
      await sareeAPI.update(id, { series_base: seriesBase, series_letter: seriesLetter, sari_name: sariName, price: price || null, description });
      setTopDirty(false);
      setSnack('Saree details saved!');
    } catch (e) { setSnack('Save failed: ' + (e.response?.data?.error || 'Error')); }
    finally { setSavingTop(false); }
  };

  const handleAddBeam = async () => {
    if (!newBeamName.trim()) return;
    setAddingBeam(true);
    try {
      const { data } = await beamAPI.add(id, { beam_name: newBeamName.trim() });
      setBeams(prev => [...prev, { ...data.beam, combinations: [] }]);
      setNewBeamName(''); setAddBeamOpen(false);
      setSnack(`Beam "${data.beam.beam_name}" added`);
    } catch (e) { setSnack(e.response?.data?.error || 'Failed to add beam'); }
    finally { setAddingBeam(false); }
  };

  const handleBeamUpdated = (updated) => {
    setBeams(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
  };

  const handleBeamDeleted = (beamId) => {
    setBeams(prev => prev.filter(b => b.id !== beamId));
    setSnack('Beam deleted');
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} color="primary"><ArrowBack /></IconButton>
        <Box flex={1}>
          <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
            Edit — {saree?.series_code}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Changes save per-section. Each beam and combination saves independently.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button startIcon={<WhatsAppIcon />} variant="outlined" color="success" onClick={() => setPasteOpen(true)}>
            Paste WhatsApp
          </Button>
          <Button variant="outlined" onClick={() => navigate(`/sarees/${id}`)}>View Detail</Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Saree identity */}
        <Grid size={12}>
          <Paper sx={{ p: 3, borderRadius: 4, border: topDirty ? '1.5px solid' : '1px solid', borderColor: topDirty ? 'warning.main' : 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Saree Identity</Typography>
              {topDirty && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSaveTop} disabled={savingTop}>
                    {savingTop ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => {
                    setSeriesBase(saree.series_base); setSeriesLetter(saree.series_letter);
                    setSariName(saree.sari_name || ''); setPrice(saree.price != null ? String(saree.price) : '');
                    setDescription(saree.description || ''); setTopDirty(false);
                  }}>Discard</Button>
                </Box>
              )}
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField size="small" fullWidth label="Series Base" value={seriesBase}
                  onChange={e => { setSeriesBase(e.target.value.toUpperCase()); setTopDirty(true); }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 1.5 }}>
                <TextField size="small" fullWidth label="Letter" value={seriesLetter}
                  onChange={e => { setSeriesLetter(e.target.value.toUpperCase()); setTopDirty(true); }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3.5 }}>
                <TextField size="small" fullWidth label="Sari Name" value={sariName}
                  onChange={e => { setSariName(e.target.value); setTopDirty(true); }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 1.5 }}>
                <TextField size="small" fullWidth type="number" label="Price (₹)" value={price}
                  onChange={e => { setPrice(e.target.value); setTopDirty(true); }} slotProps={{ htmlInput: { min: 0 } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3.5 }}>
                <TextField size="small" fullWidth label="Description" value={description}
                  onChange={e => { setDescription(e.target.value); setTopDirty(true); }} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Beams */}
        <Grid size={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Beams ({beams.length}) — Total Stock: {beams.reduce((s, b) => s + (b.combinations || []).reduce((cs, c) => cs + (c.current_stock || 0), 0), 0)} pcs
            </Typography>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setAddBeamOpen(true)}>
              Add Beam
            </Button>
          </Box>

          {beams.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: 'action.hover' }}>
              <Typography color="text.secondary">No beams yet. Add a beam to start managing combinations.</Typography>
            </Paper>
          )}

          {beams.map((beam) => (
            <BeamSection key={beam.id} beam={beam} sareeId={id}
              onBeamUpdated={handleBeamUpdated} onBeamDeleted={handleBeamDeleted} />
          ))}
        </Grid>
      </Grid>

      {/* Add Beam Dialog */}
      <Dialog open={addBeamOpen} onClose={() => setAddBeamOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Beam</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Beam Name" placeholder="e.g. White Beam" value={newBeamName}
            onChange={e => setNewBeamName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddBeam()}
            sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddBeamOpen(false); setNewBeamName(''); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddBeam} disabled={addingBeam || !newBeamName.trim()}>
            {addingBeam ? 'Adding...' : 'Add Beam'}
          </Button>
        </DialogActions>
      </Dialog>

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
      <Dialog open={!!activeDup} onClose={() => { setActiveDup(null); setDupQueue([]); }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
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

      {/* Blocked Entries Confirmation Dialog */}
      <Dialog
        open={blockedConfirmOpen}
        onClose={() => { setBlockedConfirmOpen(false); setPasteOpen(true); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
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
        PaperProps={{ sx: { borderRadius: 3 } }}
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

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
};

export default SareeEdit;
