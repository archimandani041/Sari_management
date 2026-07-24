/**
 * Stock History — Audit Trail Page
 * Redesigned to match the "Stock Audit Trail" editorial UI from the design image.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI, sareeAPI } from '../services/api';
import RequestStockDialog from '../components/common/RequestStockDialog';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Typography, FormControl, Select,
  MenuItem, TextField, Chip, Tooltip, IconButton, Snackbar,
  InputAdornment, LinearProgress, Button, Avatar, Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';

// Status chip config
const STATUS_CONFIG = {
  Increase: { label: 'STOCK IN', bg: '#DCFCE7', color: '#15803D' },
  Decrease: { label: 'DELIVERY OUT', bg: '#FEE2E2', color: '#DC2626' },
  'Manual Edit': { label: 'CORRECTION', bg: '#FEF9C3', color: '#A16207' },
  Undo: { label: 'REVERSAL', bg: '#EDE9FE', color: '#7C3AED' },
};

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const StockHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  // Today stats (computed from current page data as approximation)
  const todayInflow = history.filter(h => h.action === 'Increase').reduce((s, h) => s + Math.abs((h.details?.quantity_changed) || 0), 0);
  const todayOutflow = history.filter(h => h.action === 'Decrease').reduce((s, h) => s + Math.abs((h.details?.quantity_changed) || 0), 0);
  const manualEdits = history.filter(h => h.action === 'Manual Edit').length;

  // Dialog state
  const [selectedSaree, setSelectedSaree] = useState(null);
  const [selectedSareeId, setSelectedSareeId] = useState('');
  const [selectedBeam, setSelectedBeam] = useState(null);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [movementType, setMovementType] = useState('STOCK_IN');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [snack, setSnack] = useState('');

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
        search: debouncedSearch || undefined
      });
      setHistory(data.history || []);
      setTotal(data.pagination?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, action, debouncedSearch]);

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
    const beamName = item.details?.beam_name || item.beam_name;
    const comboName = item.details?.combination_name || item.combination_name;
    if (!sareeId && seriesCode) {
      try {
        const { data } = await sareeAPI.getAll({ search: seriesCode });
        const m = data.sarees?.find(s => s.series_code === seriesCode);
        if (m) sareeId = m.id;
      } catch { }
    }
    if (!sareeId) { setSnack('Combination no longer available.'); return; }
    try {
      const { data } = await sareeAPI.getById(sareeId);
      const saree = data.saree;
      if (!saree) { setSnack('Combination no longer available.'); return; }
      const matchedBeam = saree.beams?.find(b => b.beam_name === beamName);
      const matchedCombo = matchedBeam?.combinations?.find(c => c.combination_name === comboName);
      if (!matchedBeam || !matchedCombo) { setSnack('Combination no longer available.'); return; }
      setSelectedSaree(saree); setSelectedSareeId(sareeId);
      setSelectedBeam(matchedBeam); setSelectedCombo(matchedCombo);
      setMovementType(item.action === 'Decrease' ? 'DELIVERY_OUT' : 'STOCK_IN');
      setRequestDialogOpen(true);
    } catch { setSnack('Combination no longer available.'); }
  };

  const handleExport = () => {
    const rows = history.map(h => ({
      'Date': new Date(h.created_at).toLocaleString(),
      'Saree': h.sarees?.sari_name || '',
      'Series Code': h.sarees?.series_code || h.series_code || '',
      'Beam': h.details?.beam_name || '',
      'Combination': h.details?.combination_name || '',
      'Old Stock': h.old_stock,
      'New Stock': h.new_stock,
      'Change': h.details?.quantity_changed,
      'Action': h.action,
      'User': h.details?.user_name || h.changed_by_name || 'System',
    }));
    const ws = xlsxUtils.json_to_sheet(rows);
    const wb = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(wb, ws, 'Audit Trail');
    xlsxWriteFile(wb, 'Stock_Audit_Trail.xlsx');
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    };
  };

  return (
    <Box>
      {/* ── Page Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
          Operations Ledger
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h1" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: { xs: '2rem', md: '2.6rem' }, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'text.primary' }}>
            Stock Audit Trail
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filter by Action */}
            <FormControl size="small">
              <Select
                value={action}
                onChange={e => { setAction(e.target.value); setPage(0); }}
                displayEmpty
                startAdornment={<FilterListIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />}
                sx={{ borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem', minWidth: 160, bgcolor: 'background.paper' }}
                renderValue={v => v ? (v === 'Increase' ? 'Stock In' : v === 'Decrease' ? 'Delivery Out' : v === 'Manual Edit' ? 'Correction' : 'Reversal') : 'Filter by Action'}
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="Increase">Stock In</MenuItem>
                <MenuItem value="Decrease">Delivery Out</MenuItem>
                <MenuItem value="Manual Edit">Correction</MenuItem>
                <MenuItem value="Undo">Reversal</MenuItem>
              </Select>
            </FormControl>
            {/* Date range button */}
            <Button variant="outlined" startIcon={<CalendarTodayIcon sx={{ fontSize: 15 }} />}
              sx={{ borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem', color: 'text.primary', borderColor: 'divider', bgcolor: 'background.paper', textTransform: 'none' }}>
              Last 30 Days
            </Button>
            {/* Export */}
            <Button variant="contained" startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />} onClick={handleExport}
              sx={{ borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', bgcolor: '#3B111A', '&:hover': { bgcolor: '#2A0B12' }, textTransform: 'none', px: 2.5 }}>
              Export Report
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ── Search bar ── */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search audit logs (Ctrl+K)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 420 }, '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'background.paper' } }}
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

      {/* ── Audit Table ── */}
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
                {['Date & Time', 'Saree Info', 'Beam / Combination', 'Adjustment', 'Status', 'Responsible User', 'Action'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', py: 1.5, borderBottom: '2px solid', borderColor: 'divider' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                      {search || action ? 'No records match your filters.' : 'No transaction history found.'}
                    </Typography>
                    {(search || action) && (
                      <Button variant="outlined" size="small" sx={{ mt: 2, borderRadius: '6px' }}
                        onClick={() => { setSearch(''); setAction(''); }}>Clear Filters</Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : history.map((item) => {
                const { date, time } = formatDate(item.created_at);
                const details = item.details || {};
                const sId = item.saree_id;
                const sCode = item.sarees?.series_code || item.series_code;
                const sName = item.sarees?.sari_name || '—';
                const bName = details.beam_name || item.beam_name || '—';
                const cName = details.combination_name || item.combination_name || '—';
                const qty = details.quantity_changed ?? 0;
                const isIncrease = qty >= 0;
                const statusCfg = STATUS_CONFIG[item.action] || { label: item.action, bg: '#F3F4F6', color: '#374151' };
                const userName = details.user_name || item.changed_by_name || 'System';

                const isWhatsAppRow = item.action === 'Increase' || item.action === 'Decrease';

                return (
                  <TableRow
                    key={item.id}
                    sx={{
                      opacity: item.is_undone ? 0.45 : 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: 'background 0.12s',
                    }}
                  >
                    {/* DATE & TIME */}
                    <TableCell sx={{ py: 2.5, pr: 1, width: 130, verticalAlign: 'top' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.3 }}>{date}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.4 }}>{time}</Typography>
                    </TableCell>

                    {/* SAREE INFO */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'top', width: 200 }}>
                      <Tooltip title="View Saree Details">
                        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', cursor: 'pointer' }}
                          onClick={() => handleNavigateToSaree(sId, sCode)}>
                          <Box sx={{ width: 40, height: 40, borderRadius: '6px', bgcolor: 'rgba(59,17,26,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                            🧵
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.3, '&:hover': { color: 'primary.main' } }}>{sCode || '—'}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{sName}</Typography>
                          </Box>
                        </Box>
                      </Tooltip>
                    </TableCell>

                    {/* BEAM / COMBINATION */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'top', width: 180 }}>
                      <Tooltip title="Create Stock Movement">
                        <Box sx={{ cursor: 'pointer' }} onClick={() => handleInitiateMovement(item)}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3, '&:hover': { color: 'primary.main' } }}>{bName}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{cName}</Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>

                    {/* ADJUSTMENT */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'top', width: 160 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: isIncrease ? 'success.main' : 'error.main' }}>
                          {item.old_stock} → {item.new_stock}
                        </Typography>
                        <Chip
                          label={`${isIncrease ? '+' : ''}${qty}`}
                          size="small"
                          sx={{
                            height: 20, fontSize: '0.65rem', fontWeight: 800, borderRadius: '4px',
                            bgcolor: isIncrease ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                            color: isIncrease ? '#15803D' : '#DC2626',
                          }}
                        />
                      </Box>
                    </TableCell>

                    {/* STATUS */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'top', width: 130 }}>
                      <Chip
                        label={statusCfg.label}
                        size="small"
                        sx={{
                          height: 22, fontSize: '0.63rem', fontWeight: 800, borderRadius: '5px',
                          bgcolor: statusCfg.bg, color: statusCfg.color,
                          letterSpacing: '0.04em',
                        }}
                      />
                    </TableCell>

                    {/* RESPONSIBLE USER */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'top', width: 160 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#3B111A', color: '#fff' }}>
                          {getInitials(userName)}
                        </Avatar>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{userName}</Typography>
                      </Box>
                    </TableCell>

                    {/* ACTION — WhatsApp repeat button */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'middle', width: 70, textAlign: 'center' }}>
                      <Tooltip title="Repeat via WhatsApp">
                        <IconButton
                          onClick={() => handleInitiateMovement(item)}
                          sx={{
                            width: 36, height: 36,
                            bgcolor: '#25D366',
                            borderRadius: '50%',
                            color: '#fff',
                            '&:hover': { bgcolor: '#1ebe57', transform: 'scale(1.1)' },
                            transition: 'all 0.18s ease',
                            boxShadow: '0 2px 8px rgba(37,211,102,0.35)',
                          }}
                        >
                          <WhatsAppIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination row */}
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

      {/* ── Bottom Stat Cards ── */}
      <Grid container spacing={2}>
        {/* Today's Inflow */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
                Today's Inflow
              </Typography>
              <Box sx={{ bgcolor: 'rgba(34,197,94,0.15)', p: 1, borderRadius: '8px', display: 'flex' }}>
                <TrendingUpIcon sx={{ fontSize: 20, color: '#16A34A' }} />
              </Box>
            </Box>
            <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 400, fontSize: '2.8rem', lineHeight: 1.2, mt: 1, mb: 0.5 }}>
              {todayInflow.toLocaleString()}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'success.main' }}>+12%</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>from yesterday</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Today's Outflow */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
                Today's Outflow
              </Typography>
              <Box sx={{ bgcolor: 'rgba(239,68,68,0.12)', p: 1, borderRadius: '8px', display: 'flex' }}>
                <TrendingDownIcon sx={{ fontSize: 20, color: '#DC2626' }} />
              </Box>
            </Box>
            <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 400, fontSize: '2.8rem', lineHeight: 1.2, mt: 1, mb: 0.5 }}>
              {todayOutflow.toLocaleString()}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'error.main' }}>-4%</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>from yesterday</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Manual Edits */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
                Manual Edits
              </Typography>
              <Box sx={{ bgcolor: '#3B111A', p: 1, borderRadius: '8px', display: 'flex' }}>
                <EditNoteIcon sx={{ fontSize: 20, color: '#F0C98A' }} />
              </Box>
            </Box>
            <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 400, fontSize: '2.8rem', lineHeight: 1.2, mt: 1, mb: 0.5 }}>
              {manualEdits}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>Requires</Typography>
              <Typography
                sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => { setAction('Manual Edit'); setPage(0); }}
              >
                audit review
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Request Stock Dialog */}
      {selectedCombo && (
        <RequestStockDialog
          open={requestDialogOpen}
          onClose={() => setRequestDialogOpen(false)}
          seriesCode={selectedSaree?.series_code || ''}
          sareeId={selectedSareeId}
          beamName={selectedBeam?.beam_name || ''}
          combination={selectedCombo}
          initialMovementType={movementType}
          onSuccess={() => { fetchHistory(); setRequestDialogOpen(false); }}
        />
      )}

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}
        message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
};

export default StockHistory;
