/**
 * All Sarees Management Page
 * Main CRUD grid, sorting, filtering, quick action buttons, pagination, bulk action
 */
import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sareeAPI } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce, useDebouncedCallback } from '../hooks/useDebounce';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Typography, TextField, Button, MenuItem,
  Select, InputLabel, FormControl, Grid, IconButton, Chip, Avatar,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Skeleton, InputAdornment, LinearProgress, Tooltip, Collapse
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  Add as AddIcon,
  Search,
  Clear as ClearIcon,
  FileDownload,
  KeyboardArrowDown,
  KeyboardArrowRight,
  WhatsApp as WhatsAppIcon,
  MoreVert as MoreVertIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';
import RequestStockDialog from '../components/common/RequestStockDialog';
import { getStockHealth } from '../constants/terms';

// Filter tabs mapped to the existing `status` filter values
const STATUS_TABS = [
  { label: 'All Sarees', value: '' },
];

const getStockStatus = (total, min) => {
  if (!total || total === 0) return { label: 'Out of Stock', chipBg: 'rgba(239,68,68,0.14)', chipColor: 'error.main', bar: 'error.main' };
  if (total <= (min ?? 0)) return { label: 'Low Stock', chipBg: 'rgba(245,158,11,0.16)', chipColor: 'warning.dark', bar: 'warning.main' };
  return { label: 'In Stock', chipBg: 'sidebar.active', chipColor: 'primary.dark', bar: 'primary.main' };
};

// FreshCart-style stock capacity bar
const StockBar = ({ total, min, max, barColor }) => {
  const value = total ?? 0;
  const cap = max && max > 0 ? max : Math.max(value, (min ?? 0) * 2, 1);
  const pct = value > 0 ? Math.max(6, Math.min(100, Math.round((value / cap) * 100))) : 0;
  return (
    <Box sx={{ minWidth: 150, maxWidth: 210 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
        <Typography component="span" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
          {value}<Box component="span" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.72rem' }}> pcs</Box>
        </Typography>
        <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Min {min ?? 0}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 7, borderRadius: 5, bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: barColor },
        }}
      />
    </Box>
  );
};

const AllSarees = () => {
  const { isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightComboId = searchParams.get('highlightComboId');

  // Search/Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [company, setCompany] = useState('');
  const [color, setColor] = useState('');
  const [brandFilter, setBrandFilter] = useState(searchParams.get('brand') || '');
  const [sareeStatusFilter, setSareeStatusFilter] = useState(searchParams.get('saree_status') || '');

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Data states
  const [sarees, setSarees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Delete dialog
  const [deleteSareeObj, setDeleteSareeObj] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Request Stock Dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestCombo, setRequestCombo] = useState(null);
  const [requestBeamName, setRequestBeamName] = useState('');
  const [requestSeriesCode, setRequestSeriesCode] = useState('');
  const [requestSareeId, setRequestSareeId] = useState('');
  const [requestMovementType, setRequestMovementType] = useState('STOCK_IN');

  const openStockDialog = (combo, beam, saree, type = 'STOCK_IN') => {
    // Inject saree-level brand so the WhatsApp message shows correct KP/KPR
    setRequestCombo({ ...combo, brand: saree.brand || combo.brand });
    setRequestBeamName(beam.beam_name);
    setRequestSeriesCode(saree.series_code);
    setRequestSareeId(saree.id);
    setRequestMovementType(type);
    setRequestDialogOpen(true);
  };

  const debouncedSearch = useDebounce(search, 300);
  const debouncedCompany = useDebounce(company, 300);
  const debouncedColor = useDebounce(color, 300);

  const [expandedSarees, setExpandedSarees] = useState({});

  const toggleExpand = (sareeId) => {
    setExpandedSarees((prev) => ({
      ...prev,
      [sareeId]: !prev[sareeId],
    }));
  };

  useEffect(() => {
    const searchVal = searchParams.get('search') || '';
    if (searchVal !== search) setSearch(searchVal);
    const statusVal = searchParams.get('status') || '';
    if (statusVal !== status) setStatus(statusVal);
    const brandVal = searchParams.get('brand') || '';
    if (brandVal !== brandFilter) setBrandFilter(brandVal);
    const sareeStatusVal = searchParams.get('saree_status') || '';
    if (sareeStatusVal !== sareeStatusFilter) setSareeStatusFilter(sareeStatusVal);
    const sortVal = searchParams.get('sort') || 'newest';
    if (sortVal !== sort) setSort(sortVal);
  }, [searchParams]);

  const isDeepSearchActive = !!(
    debouncedSearch || debouncedCompany || debouncedColor ||
    brandFilter || sareeStatusFilter
  );

  useEffect(() => {
    if (isDeepSearchActive) {
      const expanded = {};
      sarees.forEach((s) => {
        expanded[s.id] = true;
      });
      setExpandedSarees(expanded);
    } else {
      setExpandedSarees({});
    }
  }, [isDeepSearchActive, sarees]);

  useEffect(() => {
    const expandId = searchParams.get('expandSareeId');
    const highlightComboId = searchParams.get('highlightComboId');
    if (expandId && sarees.length > 0) {
      setExpandedSarees((prev) => ({
        ...prev,
        [expandId]: true,
      }));
      const timer = setTimeout(() => {
        const targetId = highlightComboId ? `combo-row-${highlightComboId}` : `saree-row-${expandId}`;
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [searchParams, sarees]);

  const hasAnyFilter = !!(
    search || status || company || color || brandFilter || sareeStatusFilter || sort !== 'newest'
  );

  const clearAllFilters = () => {
    setSearch('');
    setStatus('');
    setSort('newest');
    setCompany('');
    setColor('');
    setBrandFilter('');
    setSareeStatusFilter('');
    setPage(0);
  };

  const highlightText = (text, highlight) => {
    if (!highlight || !text) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <Box
              key={i}
              component="span"
              sx={{
                backgroundColor: 'rgba(161,109,71,0.22)',
                color: 'inherit',
                fontWeight: 800,
                borderRadius: '2px',
                px: 0.25
              }}
            >
              {part}
            </Box>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const renderHighlighted = (text, fieldType) => {
    if (!text) return '';
    let matchTerm = '';

    if (fieldType === 'company') {
      matchTerm = debouncedCompany || (debouncedSearch && text.toLowerCase().includes(debouncedSearch.toLowerCase()) ? debouncedSearch : '');
    } else if (fieldType === 'color') {
      matchTerm = debouncedColor || (debouncedSearch && text.toLowerCase().includes(debouncedSearch.toLowerCase()) ? debouncedSearch : '');
    } else {
      matchTerm = debouncedSearch;
    }

    return highlightText(text, matchTerm);
  };

  const getFilteredHierarchy = (saree) => {
    const query = debouncedSearch?.toLowerCase().trim();
    const companyQ = debouncedCompany?.toLowerCase().trim();
    const colorQ = debouncedColor?.toLowerCase().trim();
    const brandQ = brandFilter?.toLowerCase().trim();
    const statusQ = sareeStatusFilter?.toLowerCase().trim();

    const hasFilters = !!(query || companyQ || colorQ || brandQ || statusQ);

    if (!hasFilters) {
      return saree.beams || [];
    }

    const matchedBeams = [];

    for (const beam of (saree.beams || [])) {
      const beamNameMatch = query && beam.beam_name?.toLowerCase().includes(query);
      const matchedCombinations = [];

      for (const combo of (beam.combinations || [])) {
        const brandMatch = !brandQ || (saree.brand?.toLowerCase() === brandQ);
        const statusMatch = !statusQ || (combo.status?.toLowerCase() === statusQ);

        if (!brandMatch || !statusMatch) continue;

        const comboNameMatch = query && combo.combination_name?.toLowerCase().includes(query);
        const comboNotesMatch = query && combo.notes?.toLowerCase().includes(query);

        const matchedColors = (combo.combination_colors || []).filter(col => {
          const colorNameMatch = query && col.color_name?.toLowerCase().includes(query);
          const colorCompanyMatch = query && col.company_name?.toLowerCase().includes(query);

          const companyFilterMatch = !companyQ || col.company_name?.toLowerCase().includes(companyQ);
          const colorFilterMatch = !colorQ || col.color_name?.toLowerCase().includes(colorQ);

          if (companyQ || colorQ) {
            return companyFilterMatch && colorFilterMatch;
          }

          return !query || colorNameMatch || colorCompanyMatch;
        });

        const sareeMatch = query && (
          saree.sari_name?.toLowerCase().includes(query) ||
          saree.series_code?.toLowerCase().includes(query)
        );

        const isColorMatch = (companyQ || colorQ)
          ? (matchedColors.length > 0)
          : (query ? (matchedColors.length > 0 || comboNameMatch || comboNotesMatch) : true);

        const isBeamOrSareeMatch = sareeMatch || beamNameMatch;

        if (isColorMatch || isBeamOrSareeMatch) {
          matchedCombinations.push({
            ...combo,
            combination_colors: combo.combination_colors || []
          });
        }
      }

      if (matchedCombinations.length > 0 || beamNameMatch) {
        matchedBeams.push({
          ...beam,
          combinations: matchedCombinations
        });
      }
    }

    return matchedBeams;
  };

  const fetchSarees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: debouncedSearch,
        sort,
        status,
        company: debouncedCompany,
        color: debouncedColor,
        brand: brandFilter,
        saree_status: sareeStatusFilter
      };
      const { data } = await sareeAPI.getAll(params);
      setSarees(data.sarees || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load sarees:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, sort, status, debouncedCompany, debouncedColor, brandFilter, sareeStatusFilter]);

  useEffect(() => {
    fetchSarees();
  }, [fetchSarees]);

  // Debounced realtime callback to avoid rapid multiple fetches
  const handleRealtimeUpdate = useDebouncedCallback(() => {
    fetchSarees();
  }, 300);

  // Real-time Supabase subscriptions
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('realtime-sarees-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combinations' }, () => {
        handleRealtimeUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beams' }, () => {
        handleRealtimeUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sarees' }, () => {
        handleRealtimeUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleRealtimeUpdate]);

  // Sync URL search parameters
  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (sort !== 'newest') params.sort = sort;
    if (brandFilter) params.brand = brandFilter;
    if (sareeStatusFilter) params.saree_status = sareeStatusFilter;
    setSearchParams(params);
  }, [search, status, sort, brandFilter, sareeStatusFilter, setSearchParams]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (value) => {
    setStatus(value);
    setPage(0);
  };

  const handleDeleteClick = (saree) => {
    setDeleteSareeObj(saree);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSareeObj) return;
    try {
      await sareeAPI.delete(deleteSareeObj.id);
      setDeleteOpen(false);
      setSnackbarMessage('Saree deleted successfully.');
      setSnackbarOpen(true);
      fetchSarees();
    } catch (error) {
      console.error('Failed to delete saree:', error);
    }
  };

  const handleExportExcel = () => {
    const exportData = sarees.map(s => ({
      'Sari Name': s.sari_name,
      'Series Code': s.series_code,
      'Price': s.price != null ? s.price : '',
      'Current Stock': s.current_stock,
      'Minimum Stock': s.minimum_stock,
      'Maximum Stock': s.maximum_stock,
      'Description': s.description || '',
      'Variants': s.color_variants?.map(v => `${v.variant_number}: ${v.color_name}${v.company_name ? ` (${v.company_name})` : ''}`).join(', ') || ''
    }));

    const worksheet = xlsxUtils.json_to_sheet(exportData);
    const workbook = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(workbook, worksheet, 'Inventory');
    xlsxWriteFile(workbook, 'Saree_Stock_Sheet.xlsx');
  };

  return (
    <Box>
      {/* Title Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            Sarees Inventory
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Browse, manage, and audit your saree stock
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExportExcel}>
            Export
          </Button>
          {(isAdmin || isStaff) && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/sarees/add')}>
              Add New Saree
            </Button>
          )}
        </Box>
      </Box>

      {/* Toolbar: filter tabs + search + advanced filters */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          {/* Pill tabs */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {STATUS_TABS.map((tab) => {
              const active = status === tab.value;
              return (
                <Box
                  key={tab.value || 'all'}
                  component="button"
                  type="button"
                  onClick={() => handleTabChange(tab.value)}
                  sx={{
                    border: active ? 'none' : '1px solid #EAE6E1', cursor: 'pointer', font: 'inherit',
                    px: 2.25, py: 1, borderRadius: 99, fontWeight: 700, fontSize: '0.8rem',
                    transition: 'all 0.15s ease',
                    bgcolor: active ? 'primary.main' : '#FAF8F5',
                    color: active ? '#FFFFFF' : '#7C726A',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: active ? '#2A0B12' : '#F2EFEA', color: active ? '#FFFFFF' : '#241C1A' },
                  }}
                >
                  {tab.label}
                </Box>
              );
            })}
          </Box>

          {/* Search */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
            {hasAnyFilter && (
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={clearAllFilters}
                startIcon={<ClearIcon />}
                sx={{ height: 40, borderRadius: 2 }}
              >
                Clear Filters
              </Button>
            )}
            <TextField
              size="small"
              placeholder="Search Saree, Beam, F-Color, Company, Brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 320 } }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearch('')} size="small"><ClearIcon fontSize="small" /></IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />
          </Box>
        </Box>

        {/* Advanced filters */}
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select value={sort} label="Sort By" onChange={(e) => setSort(e.target.value)}>
                <MenuItem value="newest">Newest Added</MenuItem>
                <MenuItem value="oldest">Oldest Added</MenuItem>
                <MenuItem value="stock_high">Stock: High to Low</MenuItem>
                <MenuItem value="stock_low">Stock: Low to High</MenuItem>
                <MenuItem value="alpha">Alphabetical</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Saree Status</InputLabel>
              <Select value={sareeStatusFilter} label="Saree Status" onChange={(e) => setSareeStatusFilter(e.target.value)}>
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="In Stock">In Stock</MenuItem>
                <MenuItem value="In Delivery">In Delivery</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Brand</InputLabel>
              <Select value={brandFilter} label="Brand" onChange={(e) => setBrandFilter(e.target.value)}>
                <MenuItem value="">All Brands</MenuItem>
                <MenuItem value="KP">KP</MenuItem>
                <MenuItem value="KPR">KPR</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 2.4 }}>
            <TextField fullWidth size="small" label="Company" placeholder="e.g. Ramdev…" value={company} onChange={(e) => setCompany(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <TextField fullWidth size="small" label="Color" placeholder="e.g. Purple…" value={color} onChange={(e) => setColor(e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      {loading && sarees.length > 0 && (
        <LinearProgress sx={{ height: 3, mb: 2, borderRadius: 1.5 }} />
      )}
      {loading && sarees.length === 0 ? (
        <Paper sx={{ p: 2, borderRadius: 4 }}>
          {[...Array(6)].map((_, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
              <Skeleton variant="rounded" width={46} height={46} />
              <Skeleton height={28} sx={{ flex: 1 }} />
            </Box>
          ))}
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 48 }} />
                <TableCell>Product</TableCell>
                <TableCell>Brand / Tags</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Stock Level</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sarees.map((saree) => {
                const st = getStockStatus(saree.total_stock, saree.min_stock);
                const sareeStatuses = Array.from(new Set(saree.beams?.flatMap(b => b.combinations?.map(c => c.status).filter(Boolean)) || []));
                const filteredBeams = getFilteredHierarchy(saree);
                const hasBeams = saree.beams && saree.beams.length > 0;

                return (
                  <Fragment key={saree.id}>
                    <TableRow
                      id={`saree-row-${saree.id}`}
                      hover
                      onClick={() => navigate(`/sarees/${saree.id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()} sx={{ width: 48 }}>
                        {hasBeams && (
                          <IconButton
                            size="small"
                            onClick={() => toggleExpand(saree.id)}
                            sx={{ color: 'text.secondary' }}
                          >
                            {expandedSarees[saree.id] ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                          </IconButton>
                        )}
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={saree.image_url || saree.beams?.flatMap(b => b.combinations || []).find(c => c.image_url)?.image_url}
                            variant="rounded"
                            sx={{ width: 46, height: 46, borderRadius: 2.5, bgcolor: 'sidebar.active', color: 'primary.main', fontSize: '1.2rem' }}
                          >
                            🧵
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
                              {renderHighlighted(saree.sari_name)}
                            </Typography>
                            <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', fontWeight: 600, letterSpacing: '0.02em' }}>
                              {renderHighlighted(saree.series_code)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 200 }}>
                          {saree.brand && (
                            <Chip label={saree.brand} size="small"
                              sx={{
                                fontSize: '0.65rem', height: 20, fontWeight: 800,
                                bgcolor: saree.brand === 'KP' ? 'secondary.light' : 'warning.light',
                                color: saree.brand === 'KP' ? 'secondary.contrastText' : 'warning.dark'
                              }} />
                          )}
                          {sareeStatuses.map(s => (
                            <Chip key={s} label={s} size="small" variant="outlined"
                              sx={{
                                fontSize: '0.65rem', height: 20, fontWeight: 700,
                                color: s === 'In Stock' ? 'success.main' : 'info.main',
                                borderColor: s === 'In Stock' ? 'success.main' : 'info.main'
                              }} />
                          ))}
                          {!saree.brand && sareeStatuses.length === 0 && (
                            <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>—</Typography>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main', whiteSpace: 'nowrap' }}>
                        {saree.price != null ? `₹${Number(saree.price).toLocaleString('en-IN')}` : '—'}
                      </TableCell>

                      <TableCell>
                        <StockBar total={saree.total_stock} min={saree.min_stock ?? 20} max={saree.maximum_stock} barColor={st.bar} />
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 4, bgcolor: st.chipBg }}>
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: st.bar }} />
                          <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 700, color: st.chipColor, whiteSpace: 'nowrap' }}>
                            {st.label}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell align="right" onClick={e => e.stopPropagation()}>
                        <Box sx={{ display: 'inline-flex', gap: 0.25 }}>
                          <Tooltip title="View">
                            <IconButton onClick={() => navigate(`/sarees/${saree.id}`)} size="small" sx={{ color: 'text.secondary' }}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {(isAdmin || isStaff) && (
                            <>
                              <Tooltip title="Edit">
                                <IconButton onClick={() => navigate(`/sarees/edit/${saree.id}`)} size="small" sx={{ color: 'primary.main' }}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton onClick={() => handleDeleteClick(saree)} size="small" color="error">
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Collapsible Row containing nested Beams, Combinations and Colors */}
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                        <Collapse in={expandedSarees[saree.id]} timeout="auto" unmountOnExit>
                          {filteredBeams.length === 0 ? (
                            <Box sx={{ py: 3, px: 3, my: 2, ml: 6, mr: 2, bgcolor: '#FAF8F5', border: '1px solid #EAE6E1', borderRadius: '8px' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No matching beams or combinations for the current filters.
                              </Typography>
                            </Box>
                          ) : (
                            filteredBeams.map((beam) => (
                              <Box key={beam.id} sx={{ py: 3, px: 3, my: 2, ml: 6, mr: 2, bgcolor: '#FAF8F5', border: '1px solid #EAE6E1', borderRadius: '8px' }}>
                                {/* Beam Name */}
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#241C1A', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
                                  Detailed Stock View: {renderHighlighted(beam.beam_name)}
                                </Typography>

                                {/* Combinations under this Beam */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                  {beam.combinations?.map((combo) => {
                                    const health = getStockHealth(combo.current_stock ?? 0, combo.minimum_stock ?? 20);
                                    const isHighlighted = combo.id === highlightComboId;
                                    return (
                                      <Box
                                        id={`combo-row-${combo.id}`}
                                        key={combo.id}
                                        sx={{
                                          p: 2.5,
                                          borderRadius: '6px',
                                          border: isHighlighted ? '2px solid #3B111A' : '1px solid #EAE6E1',
                                          bgcolor: isHighlighted ? 'rgba(59, 17, 26, 0.04)' : '#FFFFFF',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          flexWrap: 'wrap',
                                          gap: 2,
                                          transition: 'all 0.15s ease',
                                          '&:hover': { borderColor: isHighlighted ? '#3B111A' : '#AC9C94' }
                                        }}
                                      >
                                        {/* Left part: Combination Image + Details */}
                                        <Box sx={{ flex: 1, minWidth: 250, display: 'flex', alignItems: 'center', gap: 2 }}>
                                          {combo.image_url && (
                                            <Box
                                              component="img"
                                              src={combo.image_url}
                                              alt={combo.combination_name || 'Combination Image'}
                                              loading="lazy"
                                              sx={{
                                                width: 54,
                                                height: 54,
                                                borderRadius: '6px',
                                                objectFit: 'cover',
                                                border: '1px solid #EAE6E1',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                                flexShrink: 0,
                                                cursor: 'pointer',
                                                transition: 'transform 0.15s ease',
                                                '&:hover': { transform: 'scale(1.05)' }
                                              }}
                                              onClick={() => navigate(`/sarees/${saree.id}`)}
                                            />
                                          )}

                                          <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#241C1A' }}>
                                                {combo.combination_name ? renderHighlighted(combo.combination_name) : 'Unnamed Combination'}
                                              </Typography>
                                              {combo.status && (
                                                <Chip
                                                  label={combo.status}
                                                  size="small"
                                                  sx={{
                                                    height: 18, fontSize: '0.62rem', fontWeight: 800,
                                                    bgcolor: combo.status === 'In Stock' ? 'rgba(22,163,74,0.1)' : 'rgba(37,99,235,0.08)',
                                                    color: combo.status === 'In Stock' ? '#16A34A' : '#2563EB',
                                                    borderRadius: '3px'
                                                  }}
                                                />
                                              )}
                                            </Box>

                                            {/* F-Colors inline */}
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                              {combo.combination_colors?.map((col, idx) => (
                                                <Typography key={col.id} component="span" sx={{ fontSize: '0.75rem', color: '#7C726A' }}>
                                                  <strong>{col.f_number}</strong> {renderHighlighted(col.color_name, 'color')}{col.company_name ? ` (${renderHighlighted(col.company_name, 'company')})` : ''}
                                                  {idx < combo.combination_colors.length - 1 ? ' · ' : ''}
                                                </Typography>
                                              ))}
                                            </Box>
                                          </Box>
                                        </Box>

                                        {/* Right part: Stock Qty and Status + Actions */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#241C1A' }}>
                                              {combo.current_stock ?? 0} pcs
                                            </Typography>
                                            <Chip
                                              label={combo.status?.toUpperCase() || 'IN STOCK'}
                                              size="small"
                                              sx={{
                                                height: 18, fontSize: '0.6rem', fontWeight: 800,
                                                bgcolor: combo.status === 'Out of Stock' ? '#FEEBEE' : '#E2F6EA',
                                                color: combo.status === 'Out of Stock' ? '#DC2626' : '#16A34A',
                                                borderRadius: '3px'
                                              }}
                                            />
                                          </Box>

                                          <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Tooltip title="Request Stock">
                                              <Button
                                               size="small"
                                               variant="outlined"
                                               color="success"
                                               startIcon={<WhatsAppIcon sx={{ fontSize: '14px !important' }} />}
                                               onClick={() => openStockDialog(combo, beam, saree, 'STOCK')}
                                               sx={{
                                                 fontSize: '0.72rem', fontWeight: 750, borderRadius: '4px',
                                                 borderColor: '#25D366', color: '#25D366', textTransform: 'none',
                                                 '&:hover': { borderColor: '#1ebe57', bgcolor: 'rgba(37,211,102,0.06)' }
                                               }}
                                             >
                                               Request Stock
                                             </Button>
                                            </Tooltip>
                                            <IconButton
                                              size="small"
                                              onClick={() => navigate('/history')}
                                              sx={{
                                                color: '#7C726A',
                                                border: '1px solid #EAE6E1',
                                                borderRadius: '4px',
                                                '&:hover': { bgcolor: '#FAF8F5' }
                                              }}
                                            >
                                              <HistoryIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                          </Box>
                                        </Box>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </Box>
                            ))
                          )}
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
              {sarees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🔍</Typography>
                    <Typography sx={{ fontWeight: 700 }}>No matching sarees or combinations found.</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Try searching by Saree number, Beam, Combination, F-Color, Brand, or Company.
                    </Typography>
                    {hasAnyFilter && (
                      <Button variant="outlined" size="small" onClick={clearAllFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', pb: 1 }}>Delete Saree</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
              Sari Number:
            </Typography>
            <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800 }}>
              {deleteSareeObj?.series_code}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 700, color: 'error.main' }}>
            This will permanently delete:
          </Typography>
          <Box sx={{ pl: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <span>• All Beams</span>
              <span>• All Combinations</span>
              <span>• All Color Rows</span>
              <span>• Stock History</span>
              <span>• Stock Requests</span>
              <span>• Activity Logs</span>
              <span>• Product Image</span>
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete Permanently</Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Dialog open={snackbarOpen} onClose={() => setSnackbarOpen(false)} slotProps={{ paper: { sx: { p: 1, borderRadius: 2 } } }}>
        <DialogContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{snackbarMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnackbarOpen(false)} variant="contained" size="small">OK</Button>
        </DialogActions>
      </Dialog>

      {/* Request Stock Dialog */}
      <RequestStockDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        combination={requestCombo}
        beamName={requestBeamName}
        seriesCode={requestSeriesCode}
        sareeId={requestSareeId}
        initialMovementType={requestMovementType}
        onSuccess={() => {
          fetchSarees();
          setRequestDialogOpen(false);
        }}
      />
    </Box>
  );
};

export default AllSarees;
