/**
 * Advanced Search Page - Professional ERP Style
 * Multi-level search, global search, cascading dropdowns, multi-select filters,
 * breadcrumbs, inline actions (edit, duplicate, update stock, delete), and debounced search.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { sareeAPI, beamAPI, combinationAPI, stockAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Box, Grid, Paper, Typography, TextField, FormControl, InputLabel,
  Select, MenuItem, Checkbox, ListItemText, OutlinedInput, Button, Chip,
  Card, CardContent, CardMedia, IconButton, Badge, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, CircularProgress, Breadcrumbs, Link,
  Tooltip, Accordion, AccordionSummary, AccordionDetails, Divider, Slider, LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon, FilterList as FilterIcon, Edit as EditIcon,
  Delete as DeleteIcon, ContentCopy as DuplicateIcon, Visibility as ViewIcon,
  Refresh as RefreshIcon, ExpandMore as ExpandMoreIcon, Warning as WarningIcon,
  Inventory as InventoryIcon, LocalShipping as StockIcon
} from '@mui/icons-material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import RequestStockDialog from '../components/common/RequestStockDialog';

// Debounce hook helper
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const AdvancedSearch = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Primary State
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Dropdown Metadata
  const [sareesList, setSareesList] = useState([]);
  const [beamsList, setBeamsList] = useState([]); // Unique beam names globally
  const [companiesList, setCompaniesList] = useState([]); // Unique company names globally
  const [maxStockLimit, setMaxStockLimit] = useState(100);

  // Cascade states
  const [sareeBeams, setSareeBeams] = useState([]); // Beams loaded for selected saree

  // Filter States
  const [globalQuery, setGlobalQuery] = useState('');
  const [selectedSareeId, setSelectedSareeId] = useState('');
  const [selectedBeamId, setSelectedBeamId] = useState('');
  const [selectedBeamName, setSelectedBeamName] = useState('');
  const [comboQuery, setComboQuery] = useState('');
  const [fColorQuery, setFColorQuery] = useState('');

  // Advanced Sidebar Filters
  const [stockStatus, setStockStatus] = useState('all');
  const [filterBeams, setFilterBeams] = useState([]);
  const [filterCompanies, setFilterCompanies] = useState([]);
  const [stockRange, setStockRange] = useState([0, 500]);
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasImage, setHasImage] = useState('all');

  // Dialog / Modal States
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [editComboName, setEditComboName] = useState('');
  const [editStock, setEditStock] = useState(0);
  const [editMinStock, setEditMinStock] = useState(20);
  const [editNotes, setEditNotes] = useState('');
  const [editColors, setEditColors] = useState([]); // array of { f_number, color_name, company_name }



  // Request Stock dialog states
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestCombo, setRequestCombo] = useState(null);

  // Debounced input states
  const debouncedGlobalQuery = useDebounce(globalQuery, 300);
  const debouncedComboQuery = useDebounce(comboQuery, 300);
  const debouncedFColorQuery = useDebounce(fColorQuery, 300);

  // Fetch search results and metadata
  const executeSearch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        q: debouncedGlobalQuery,
        sareeId: selectedSareeId,
        beamId: selectedBeamId,
        comboSearch: debouncedComboQuery,
        fColorSearch: debouncedFColorQuery,
        stockStatus,
        beams: filterBeams.join(','),
        companies: filterCompanies.join(','),
        minStock: stockRange[0],
        maxStock: stockRange[1],
        dateRange,
        startDate,
        endDate,
        hasImage
      };

      const { data } = await sareeAPI.advancedSearch(params);
      setResults(data.results || []);

      // Populate filters metadata on first load or general query
      if (data.metadata) {
        setSareesList(data.metadata.sarees || []);
        setBeamsList(data.metadata.beams || []);
        setCompaniesList(data.metadata.companies || []);
        setMaxStockLimit(data.metadata.maxStockLimit || 100);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch search results.');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedGlobalQuery, selectedSareeId, selectedBeamId,
    debouncedComboQuery, debouncedFColorQuery, stockStatus,
    filterBeams, filterCompanies, stockRange, dateRange,
    startDate, endDate, hasImage
  ]);

  // Load beams when a saree number is selected (Level 1 Cascade)
  useEffect(() => {
    const fetchSareeBeams = async () => {
      if (!selectedSareeId) {
        setSareeBeams([]);
        setSelectedBeamId('');
        return;
      }
      try {
        const { data } = await sareeAPI.getById(selectedSareeId);
        setSareeBeams(data.saree?.beams || []);
      } catch (err) {
        console.error('Failed to fetch beams for selected saree:', err);
      }
    };
    fetchSareeBeams();
  }, [selectedSareeId]);

  // Execute Search automatically on changes
  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  // Quick Action: Reset Filters
  const handleResetFilters = () => {
    setGlobalQuery('');
    setSelectedSareeId('');
    setSelectedBeamId('');
    setSelectedBeamName('');
    setComboQuery('');
    setFColorQuery('');
    setStockStatus('all');
    setFilterBeams([]);
    setFilterCompanies([]);
    setStockRange([0, 500]);
    setDateRange('all');
    setStartDate('');
    setEndDate('');
    setHasImage('all');
    setActionSuccess('Filters reset successfully!');
  };

  // Quick Action: Duplicate Combination
  const handleDuplicateCombination = async (combo) => {
    if (!isAdmin) return;
    try {
      // 1. Fetch details to get colors
      const dataToPost = {
        combination_name: `${combo.combination_name || 'Combination'} (Copy)`,
        current_stock: combo.current_stock,
        minimum_stock: combo.minimum_stock,
        notes: combo.notes,
        colors: combo.combination_colors.map(col => ({
          f_number: col.f_number,
          color_name: col.color_name,
          company_name: col.company_name
        }))
      };

      await combinationAPI.add(combo.beam_id, dataToPost);
      setActionSuccess('Combination duplicated successfully!');
      executeSearch();
    } catch (err) {
      console.error(err);
      setError('Failed to duplicate combination.');
    }
  };

  // Quick Action: Delete Combination
  const handleDeleteCombination = async (comboId) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to permanently delete this combination?')) return;
    try {
      await combinationAPI.delete(comboId);
      setActionSuccess('Combination deleted successfully!');
      executeSearch();
    } catch (err) {
      console.error(err);
      setError('Failed to delete combination.');
    }
  };

  // Quick Action: Open Edit Dialog
  const handleOpenEdit = (combo) => {
    setEditingCombo(combo);
    setEditComboName(combo.combination_name || '');
    setEditStock(combo.current_stock || 0);
    setEditMinStock(combo.minimum_stock || 20);
    setEditNotes(combo.notes || '');
    setEditColors(combo.combination_colors ? [...combo.combination_colors] : []);
    setQuickEditOpen(true);
  };

  // Quick Action: Save Edit
  const handleSaveEdit = async () => {
    try {
      await combinationAPI.update(editingCombo.id, {
        combination_name: editingCombo.combination_name,
        current_stock: editStock,
        minimum_stock: editMinStock,
        notes: editNotes,
        colors: editColors.map(c => ({
          f_number: c.f_number,
          color_name: c.color_name,
          company_name: c.company_name
        }))
      });
      setQuickEditOpen(false);
      setActionSuccess('Combination updated successfully!');
      executeSearch();
    } catch (err) {
      console.error(err);
      setError('Failed to save combination updates.');
    }
  };

  // Edit dialog helper to add/remove color rows
  const handleAddColorRow = () => {
    const nextF = `F-${editColors.length + 1}`;
    setEditColors([...editColors, { f_number: nextF, color_name: '', company_name: '' }]);
  };

  const handleRemoveColorRow = (index) => {
    const updated = editColors.filter((_, i) => i !== index).map((col, idx) => ({
      ...col,
      f_number: `F-${idx + 1}`
    }));
    setEditColors(updated);
  };

  const handleColorChange = (index, field, value) => {
    const updated = [...editColors];
    updated[index][field] = value;
    setEditColors(updated);
  };



  // Selected Saree Details for Breadcrumbs
  const selectedSareeObj = sareesList.find(s => s.id === selectedSareeId);
  const selectedComboObj = results.find(r => r.id === editingCombo?.id);

  return (
    <Box sx={{ flexGrow: 1, px: { xs: 1, md: 3 }, py: 3 }}>
      
      {/* Dynamic Breadcrumbs Navigation (Level 5 requirement) */}
      <Paper sx={{ p: 1.5, px: 3, borderRadius: 3, mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link underline="hover" color="inherit" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            Home
          </Link>
          <Link underline="hover" color="inherit" href="/search" onClick={(e) => { e.preventDefault(); handleResetFilters(); }}>
            Search
          </Link>
          {selectedSareeObj && (
            <Typography color="primary.main" sx={{ fontWeight: 700 }}>
              {selectedSareeObj.series_code}
            </Typography>
          )}
          {selectedBeamName && (
            <Typography color="secondary.main" sx={{ fontWeight: 700 }}>
              {selectedBeamName}
            </Typography>
          )}
          {editingCombo && (
            <Typography color="text.primary" sx={{ fontWeight: 600 }}>
              {editComboName || 'Combination'}
            </Typography>
          )}
        </Breadcrumbs>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={executeSearch}>
          Refresh
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {actionSuccess && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setActionSuccess('')}>{actionSuccess}</Alert>}

      <Grid container spacing={3}>
        {/* Right Side: Cascading dropdowns & results */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
            
            {/* Global Search Bar */}
            <TextField
              fullWidth
              size="medium"
              placeholder="Global Search (Saree #, Beam, Combination, F-Color, Company...)"
              value={globalQuery}
              onChange={e => setGlobalQuery(e.target.value)}
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }
              }}
            />

            {/* Level 1 & Level 2 Cascading Selectors */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Level 1: Sari Number</InputLabel>
                  <Select
                    value={selectedSareeId}
                    label="Level 1: Sari Number"
                    onChange={e => {
                      setSelectedSareeId(e.target.value);
                      setSelectedBeamId('');
                      setSelectedBeamName('');
                    }}
                  >
                    <MenuItem value="">-- Select Sari Number --</MenuItem>
                    {sareesList.map(s => (
                      <MenuItem key={s.id} value={s.id}>{s.series_code} {s.sari_name ? `(${s.sari_name})` : ''}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small" disabled={!selectedSareeId}>
                  <InputLabel>Level 2: Beam</InputLabel>
                  <Select
                    value={selectedBeamId}
                    label="Level 2: Beam"
                    onChange={e => {
                      setSelectedBeamId(e.target.value);
                      const b = sareeBeams.find(x => x.id === e.target.value);
                      setSelectedBeamName(b ? b.beam_name : '');
                    }}
                  >
                    <MenuItem value="">-- Select Beam --</MenuItem>
                    {sareeBeams.map(b => (
                      <MenuItem key={b.id} value={b.id}>{b.beam_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Level 4 & Level 5 Text Filter Inputs */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Level 4: Search Combination Name/Code"
                  value={comboQuery}
                  onChange={e => setComboQuery(e.target.value)}
                  placeholder="e.g. Combination 1"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Level 5: Search F Colors"
                  value={fColorQuery}
                  onChange={e => setFColorQuery(e.target.value)}
                  placeholder="e.g. Purple, Baby Pink..."
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Results Grid */}
          {loading && results.length > 0 && (
            <LinearProgress sx={{ height: 3, mb: 3, borderRadius: 1.5 }} />
          )}
          {loading && results.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : results.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 3 }}>No combinations found matching your search criteria.</Alert>
          ) : (
            <Grid container spacing={2.5}>
              {results.map((combo) => {
                const isLowStock = combo.current_stock <= combo.minimum_stock;
                const isOutOfStock = combo.current_stock === 0;

                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={combo.id}>
                    <Card sx={{ borderRadius: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      <CardMedia
                        component="img"
                        height={160}
                        image={combo.image_url || '/placeholder-sari.png'}
                        alt={combo.combination_name}
                      />
                      <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Chip label={combo.series_code} color="primary" size="small" sx={{ fontWeight: 800 }} />
                            <Chip label={combo.beam_name} color="secondary" size="small" variant="outlined" />
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                            {combo.combination_name || 'Unnamed Combination'}
                          </Typography>

                          {/* F-Colors chips */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 2 }}>
                            {combo.combination_colors?.map(col => (
                              <Chip
                                key={col.id}
                                label={`${col.f_number}: ${col.color_name} ${col.company_name ? `(${col.company_name})` : ''}`}
                                size="small"
                                sx={{ fontSize: '0.72rem' }}
                              />
                            ))}
                          </Box>
                        </Box>

                        <Box sx={{ mt: 'auto' }}>
                          <Divider sx={{ mb: 2 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Current Stock</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 800, color: isOutOfStock ? 'error.main' : isLowStock ? 'warning.main' : 'success.main' }}>
                                {combo.current_stock} pcs
                              </Typography>
                            </Box>
                            {isOutOfStock ? (
                              <Chip label="OUT OF STOCK" color="error" size="small" sx={{ fontWeight: 700 }} />
                            ) : isLowStock ? (
                              <Chip label="LOW STOCK ALERT" color="warning" size="small" icon={<WarningIcon />} sx={{ fontWeight: 700 }} />
                            ) : null}
                          </Box>

                          {/* Quick Actions (Level 5 requirement) */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                            <Tooltip title="Request Stock via WhatsApp">
                              <IconButton onClick={() => {
                                // RequestStockDialog expects format of combinations inside saree.beams.combinations,
                                // but we also pass properties individually or adapt the mapping.
                                // Let's construct a normalized combination object.
                                setRequestCombo({
                                  id: combo.id,
                                  combination_name: combo.combination_name,
                                  current_stock: combo.current_stock,
                                  minimum_stock: combo.minimum_stock,
                                  combination_colors: combo.combination_colors
                                });
                                setRequestDialogOpen(true);
                              }} color="success" size="small">
                                <WhatsAppIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Details">
                              <IconButton onClick={() => navigate(`/sarees/${combo.saree_id}`)} color="primary" size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <>
                                <Tooltip title="Quick Edit">
                                  <IconButton onClick={() => handleOpenEdit(combo)} color="info" size="small">
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Duplicate Combination">
                                  <IconButton onClick={() => handleDuplicateCombination(combo)} color="secondary" size="small">
                                    <DuplicateIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Permanently">
                                  <IconButton onClick={() => handleDeleteCombination(combo.id)} color="error" size="small">
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Grid>
      </Grid>

      {/* QUICK EDIT DIALOG */}
      <Dialog open={quickEditOpen} onClose={() => setQuickEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Quick Edit Combination</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 6 }}>
              <TextField fullWidth type="number" label="Stock" value={editStock} onChange={e => setEditStock(parseInt(e.target.value) || 0)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 6 }}>
              <TextField fullWidth type="number" label="Minimum Stock" value={editMinStock} onChange={e => setEditMinStock(parseInt(e.target.value) || 0)} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth multiline rows={2} label="Notes" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>F-Colors configuration</Typography>
            <Button size="small" variant="outlined" onClick={handleAddColorRow}>Add F-Color Row</Button>
          </Box>

          {editColors.map((col, idx) => (
            <Grid container spacing={2} key={idx} sx={{ mb: 1.5, alignItems: 'center' }}>
              <Grid size={2}>
                <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>{col.f_number}</Typography>
              </Grid>
              <Grid size={5}>
                <TextField fullWidth size="small" label="Color Name" value={col.color_name} onChange={e => handleColorChange(idx, 'color_name', e.target.value)} />
              </Grid>
              <Grid size={4}>
                <TextField fullWidth size="small" label="Company Name" value={col.company_name || ''} onChange={e => handleColorChange(idx, 'company_name', e.target.value)} />
              </Grid>
              <Grid size={1}>
                <IconButton color="error" onClick={() => handleRemoveColorRow(idx)}><DeleteIcon /></IconButton>
              </Grid>
            </Grid>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setQuickEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">Save Changes</Button>
        </DialogActions>
      </Dialog>



      {/* WhatsApp Request Stock Dialog */}
      <RequestStockDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        combination={requestCombo}
        beamName={requestCombo ? results.find(r => r.id === requestCombo.id)?.beam_name : ''}
        seriesCode={requestCombo ? results.find(r => r.id === requestCombo.id)?.series_code : ''}
        sareeId={requestCombo ? results.find(r => r.id === requestCombo.id)?.saree_id : ''}
      />
    </Box>
  );
};

export default AdvancedSearch;
