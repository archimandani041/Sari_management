/**
 * Stock History — Audit Trail & Reports Page
 * Supports 3 main inventory actions + extensible actions with full reporting:
 *  - Stock (Green Badge 🟢 ➕)
 *  - Delivery (Blue Badge 🔵 🏭)
 *  - Stock Delivery (Orange Badge 🟠 📦)
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI, sareeAPI } from '../services/api';
import RequestStockDialog from '../components/common/RequestStockDialog';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Typography, FormControl, Select,
  MenuItem, TextField, Chip, Tooltip, IconButton, Snackbar,
  InputAdornment, LinearProgress, Button, Avatar, Grid, Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';

// Status badge styling per requirement
const STATUS_CONFIG = {
  Stock:          { label: 'STOCK',           bg: '#DCFCE7', color: '#15803D', icon: '➕' },
  Increase:       { label: 'STOCK',           bg: '#DCFCE7', color: '#15803D', icon: '➕' },
  Delivery:       { label: 'DELIVERY',        bg: '#E0F2FE', color: '#0284C7', icon: '🏭' },
  'Stock Delivery': { label: 'STOCK DELIVERY', bg: '#FFEDD5', color: '#EA580C', icon: '📦' },
  Decrease:       { label: 'STOCK DELIVERY', bg: '#FFEDD5', color: '#EA580C', icon: '📦' },
  Return:         { label: 'RETURN',          bg: '#F0FDF4', color: '#16A34A', icon: '🔄' },
  Damage:         { label: 'DAMAGE',          bg: '#FEE2E2', color: '#DC2626', icon: '⚠️' },
  Transfer:       { label: 'TRANSFER',        bg: '#F3E8FF', color: '#9333EA', icon: '🔀' },
  Adjustment:     { label: 'ADJUSTMENT',      bg: '#FEF9C3', color: '#A16207', icon: '✏️' },
  Sample:         { label: 'SAMPLE',          bg: '#E0E7FF', color: '#4F46E5', icon: '🧪' },
  'Manual Edit':  { label: 'CORRECTION',      bg: '#FEF9C3', color: '#A16207', icon: '✏️' },
  Undo:           { label: 'REVERSAL',        bg: '#EDE9FE', color: '#7C3AED', icon: '↩️' },
};

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const StockHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory]                 = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [action, setAction]                   = useState('');
  const [dateRange, setDateRange]             = useState('');
  const [search, setSearch]                   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]                       = useState(0);
  const [rowsPerPage, setRowsPerPage]         = useState(25);
  const [total, setTotal]                     = useState(0);

  // Summary Metrics computed from loaded page/dataset
  const stockAddedCount = history
    .filter(h => h.action === 'Stock' || h.action === 'Increase')
    .reduce((s, h) => s + (h.details?.quantity || Math.abs(h.details?.quantity_changed || 0)), 0);

  const machineDelivCount = history
    .filter(h => h.action === 'Delivery')
    .reduce((s, h) => s + (h.details?.quantity || Math.abs(h.details?.quantity_changed || 0)), 0);

  const stockDelivCount = history
    .filter(h => h.action === 'Stock Delivery' || h.action === 'Decrease')
    .reduce((s, h) => s + (h.details?.quantity || Math.abs(h.details?.quantity_changed || 0)), 0);

  // Dialog state
  const [selectedSaree, setSelectedSaree]         = useState(null);
  const [selectedSareeId, setSelectedSareeId]     = useState('');
  const [selectedBeam, setSelectedBeam]           = useState(null);
  const [selectedCombo, setSelectedCombo]         = useState(null);
  const [initialAction, setInitialAction]         = useState('Stock');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [snack, setSnack]                         = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await stockAPI.getHistory({
        page: page + 1, limit: rowsPerPage,
        action: action || undefined,
        date_range: dateRange || undefined,
        search: debouncedSearch || undefined
      });
      setHistory(data.history || []);
      setTotal(data.pagination?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, action, dateRange, debouncedSearch]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleNavigateToSaree = async (sareeId, seriesCode) => {
    if (sareeId) { navigate(`/sarees/${sareeId}`); return; }
    if (!seriesCode) return;
    try {
      const { data } = await sareeAPI.getAll({ search: seriesCode });
      const matched = data.sarees?.find(s => s.series_code === seriesCode);
      if (matched) navigate(`/sarees/${matched.id}`);
      else setSnack('Saree details are no longer available.');
    } catch { setSnack('Saree details are no longer available.'); }
  };

  const handleInitiateMovement = async (item) => {
    let sareeId = item.saree_id;
    const seriesCode = item.series_code || item.sarees?.series_code;
    const beamName   = item.details?.beam_name || item.beam_name;
    const comboName  = item.details?.combination_name || item.combination_name;
    if (!sareeId && seriesCode) {
      try {
        const { data } = await sareeAPI.getAll({ search: seriesCode });
        const m = data.sarees?.find(s => s.series_code === seriesCode);
        if (m) sareeId = m.id;
      } catch {}
    }
    if (!sareeId) { setSnack('Combination no longer available.'); return; }
    try {
      const { data } = await sareeAPI.getById(sareeId);
      const saree = data.saree;
      if (!saree) { setSnack('Combination no longer available.'); return; }
      const matchedBeam  = saree.beams?.find(b => b.beam_name === beamName);
      const matchedCombo = matchedBeam?.combinations?.find(c => c.combination_name === comboName);
      if (!matchedBeam || !matchedCombo) { setSnack('Combination no longer available.'); return; }
      
      setSelectedSaree(saree); setSelectedSareeId(sareeId);
      setSelectedBeam(matchedBeam); setSelectedCombo(matchedCombo);
      setInitialAction(item.action === 'Delivery' ? 'Delivery' : item.action === 'Stock Delivery' || item.action === 'Decrease' ? 'Stock Delivery' : 'Stock');
      setRequestDialogOpen(true);
    } catch { setSnack('Combination no longer available.'); }
  };

  // Full 15-column Excel Export per user specification
  const handleExport = () => {
    const rows = history.map(h => {
      const d = new Date(h.created_at);
      const details = h.details || {};
      return {
        'Date': d.toLocaleDateString('en-IN'),
        'Time': d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        'Sari Number': h.sarees?.series_code || details.sari_number || 'UNKNOWN',
        'Beam': details.beam_name || h.beam_name || 'UNKNOWN',
        'Combination': details.combination_name || h.combination_name || 'Standard',
        'Opening Stock': h.old_stock,
        'Action': h.action,
        'Quantity': details.quantity || Math.abs(details.quantity_changed || 0),
        'Closing Stock': h.new_stock,
        'Reason': details.reason || h.reason || '',
        'Supplier': details.supplier_name || h.supplier_name || '',
        'Customer': details.customer_name || h.customer_name || '',
        'Machine': details.machine || h.machine || '',
        'Invoice Number': details.invoice_number || h.invoice_number || '',
        'User': details.user_name || h.changed_by_name || 'System',
        'Remarks': details.remarks || h.remarks || ''
      };
    });

    const ws = xlsxUtils.json_to_sheet(rows);
    const wb = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(wb, ws, 'Stock Audit & Reports');
    xlsxWriteFile(wb, `Stock_Report_${action || 'All'}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
          Operations & Inventory Ledger
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h1" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: { xs: '2rem', md: '2.6rem' }, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'text.primary' }}>
            Stock Audit & Reports
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Filter by Action Report */}
            <FormControl size="small">
              <Select
                value={action}
                onChange={e => { setAction(e.target.value); setPage(0); }}
                displayEmpty
                startAdornment={<FilterListIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />}
                sx={{ borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem', minWidth: 180, bgcolor: 'background.paper' }}
              >
                <MenuItem value="">All Actions Report</MenuItem>
                <MenuItem value="Stock">🟢 Stock Added Report</MenuItem>
                <MenuItem value="Delivery">🔵 Delivery to Machine Report</MenuItem>
                <MenuItem value="Stock Delivery">🟠 Stock Delivery Report</MenuItem>
                <MenuItem value="Return">🔄 Return Report</MenuItem>
                <MenuItem value="Damage">⚠️ Damage Report</MenuItem>
                <MenuItem value="Transfer">🔀 Transfer Report</MenuItem>
                <MenuItem value="Adjustment">✏️ Adjustment Report</MenuItem>
                <MenuItem value="Sample">🧪 Sample Report</MenuItem>
              </Select>
            </FormControl>

            {/* Date Range Filter */}
            <FormControl size="small">
              <Select
                value={dateRange}
                onChange={e => { setDateRange(e.target.value); setPage(0); }}
                displayEmpty
                startAdornment={<CalendarTodayIcon sx={{ fontSize: 15, mr: 0.5, color: 'text.secondary' }} />}
                sx={{ borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem', minWidth: 150, bgcolor: 'background.paper' }}
              >
                <MenuItem value="">All Time</MenuItem>
                <MenuItem value="today">Daily Report (Today)</MenuItem>
                <MenuItem value="monthly">Monthly Report</MenuItem>
              </Select>
            </FormControl>

            {/* Export Report */}
            <Button variant="contained" startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />} onClick={handleExport}
              sx={{ borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', bgcolor: '#3B111A', '&:hover': { bgcolor: '#2A0B12' }, textTransform: 'none', px: 2.5 }}>
              Export Report
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Summary KPI Bar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: '#F0FDF4' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#15803D', textTransform: 'uppercase' }}>
                  Stock Added (Visible Page)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#15803D', mt: 0.5 }}>
                  +{stockAddedCount.toLocaleString()} pcs
                </Typography>
              </Box>
              <AddCircleIcon sx={{ fontSize: 32, color: '#15803D' }} />
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: '#F0F9FF' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>
                  Machine Deliveries (Production)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0284C7', mt: 0.5 }}>
                  {machineDelivCount.toLocaleString()} pcs
                </Typography>
              </Box>
              <PrecisionManufacturingIcon sx={{ fontSize: 32, color: '#0284C7' }} />
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: '#FFF7ED' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#EA580C', textTransform: 'uppercase' }}>
                  Stock Deliveries (Dispatched)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#EA580C', mt: 0.5 }}>
                  -{stockDelivCount.toLocaleString()} pcs
                </Typography>
              </Box>
              <LocalShippingIcon sx={{ fontSize: 32, color: '#EA580C' }} />
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by Sari Code, Beam, Customer, Supplier, Machine, Invoice..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 460 }, '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'background.paper' } }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}><ClearIcon sx={{ fontSize: 16 }} /></IconButton>
                </InputAdornment>
              ) : null
            }
          }}
        />
      </Box>

      {/* Audit Table */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', overflow: 'hidden', mb: 3, position: 'relative' }}>
        {loading && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}>
            <LinearProgress color="primary" sx={{ height: 2 }} />
          </Box>
        )}
        <TableContainer>
          <Table sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                {['Date & Time', 'Sari Number', 'Beam / Combination', 'Opening', 'Action', 'Quantity', 'Closing', 'Details / Metadata', 'User', 'Action'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', py: 1.5, borderBottom: '2px solid', borderColor: 'divider' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                      {search || action || dateRange ? 'No records match your filters.' : 'No transaction history found.'}
                    </Typography>
                    {(search || action || dateRange) && (
                      <Button variant="outlined" size="small" sx={{ mt: 2, borderRadius: '6px' }}
                        onClick={() => { setSearch(''); setAction(''); setDateRange(''); }}>Clear Filters</Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : history.map((item) => {
                const { date, time } = formatDate(item.created_at);
                const details   = item.details || {};
                const sId       = item.saree_id;
                const sCode     = item.sarees?.series_code || details.sari_number || item.series_code || '—';
                const sName     = item.sarees?.sari_name || '—';
                const bName     = details.beam_name || item.beam_name || '—';
                const cName     = details.combination_name || item.combination_name || '—';
                
                const qtyVal = details.quantity || Math.abs(details.quantity_changed || 0);
                const statusCfg = STATUS_CONFIG[item.action] || { label: item.action, bg: '#F3F4F6', color: '#374151', icon: '📝' };
                const userName  = details.user_name || item.changed_by_name || 'System';

                return (
                  <TableRow
                    key={item.id}
                    sx={{
                      opacity: item.is_undone ? 0.45 : 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    {/* DATE & TIME */}
                    <TableCell sx={{ py: 2, pr: 1, width: 120, verticalAlign: 'top' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>{date}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{time}</Typography>
                    </TableCell>

                    {/* SARI NUMBER */}
                    <TableCell sx={{ py: 2, verticalAlign: 'top', width: 140 }}>
                      <Tooltip title="View Saree Details">
                        <Box sx={{ cursor: 'pointer' }} onClick={() => handleNavigateToSaree(sId, sCode)}>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'primary.main' }}>{sCode}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{sName}</Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>

                    {/* BEAM / COMBINATION */}
                    <TableCell sx={{ py: 2, verticalAlign: 'top', width: 160 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{bName}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{cName}</Typography>
                    </TableCell>

                    {/* OPENING STOCK */}
                    <TableCell sx={{ py: 2, verticalAlign: 'top', width: 80 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{item.old_stock}</Typography>
                    </TableCell>

                    {/* ACTION BADGE */}
                    <TableCell sx={{ py: 2, verticalAlign: 'top', width: 140 }}>
                      <Chip
                        icon={<span style={{ fontSize: '0.85rem', marginLeft: '6px' }}>{statusCfg.icon}</span>}
                        label={statusCfg.label}
                        size="small"
                        sx={{
                          height: 24, fontSize: '0.68rem', fontWeight: 800, borderRadius: '6px',
                          bgcolor: statusCfg.bg, color: statusCfg.color,
                        }}
                      />
                    </TableCell>

                    {/* QUANTITY */}
                    <TableCell sx={{ py: 2, verticalAlign: 'top', width: 90 }}>
                      <Typography sx={{
                        fontWeight: 800, fontSize: '0.85rem',
                        color: item.action === 'Stock' || item.action === 'Increase' ? 'success.main' : item.action === 'Stock Delivery' || item.action === 'Decrease' ? 'error.main' : 'info.main'
                      }}>
                        {item.action === 'Stock' || item.action === 'Increase' ? `+${qtyVal}` : item.action === 'Stock Delivery' || item.action === 'Decrease' ? `-${qtyVal}` : `${qtyVal}`}
                      </Typography>
                    </TableCell>

                    {/* CLOSING STOCK */}
                    <TableCell sx={{ py: 2, verticalAlign: 'top', width: 80 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>{item.new_stock}</Typography>
                    </TableCell>

                    {/* METADATA / DETAILS */}
                    <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                      {details.supplier_name && <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Supplier: {details.supplier_name}</Typography>}
                      {details.customer_name && <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Customer: {details.customer_name}</Typography>}
                      {details.machine && <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Machine: {details.machine} {details.operator_name ? `(${details.operator_name})` : ''}</Typography>}
                      {details.invoice_number && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Invoice: #{details.invoice_number}</Typography>}
                      {details.remarks && <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary', fontStyle: 'italic' }}>"{details.remarks}"</Typography>}
                    </TableCell>

                    {/* USER */}
                    <TableCell sx={{ py: 2, verticalAlign: 'top', width: 130 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#3B111A', color: '#fff' }}>
                          {getInitials(userName)}
                        </Avatar>
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{userName}</Typography>
                      </Box>
                    </TableCell>

                    {/* ACTION REPEAT BUTTON */}
                    <TableCell sx={{ py: 2, verticalAlign: 'middle', width: 60, textAlign: 'center' }}>
                      <Tooltip title="Repeat Action">
                        <IconButton size="small" onClick={() => handleInitiateMovement(item)}>
                          <WhatsAppIcon sx={{ fontSize: 18, color: '#25D366' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 500 }}>
            Showing <strong>{Math.min(page * rowsPerPage + 1, total)}–{Math.min((page + 1) * rowsPerPage, total)}</strong> of <strong>{total.toLocaleString()}</strong> entries
          </Typography>
          <TablePagination
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ '& .MuiToolbar-root': { pl: 0, minHeight: 36 }, '& .MuiTablePagination-displayedRows': { display: 'none' } }}
          />
        </Box>
      </Paper>

      {/* Action Dialog */}
      {selectedCombo && (
        <RequestStockDialog
          open={requestDialogOpen}
          onClose={() => setRequestDialogOpen(false)}
          seriesCode={selectedSaree?.series_code || ''}
          sareeId={selectedSareeId}
          beamName={selectedBeam?.beam_name || ''}
          combination={selectedCombo}
          initialAction={initialAction}
          onSuccess={() => { fetchHistory(); setRequestDialogOpen(false); }}
        />
      )}

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}
        message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
};

export default StockHistory;
