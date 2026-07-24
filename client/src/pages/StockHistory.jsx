/**
 * Stock History — Audit Trail & Rollback History Page
 * Includes full Rollback History system for auditing, undoing, and tracking all stock transactions.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI, sareeAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import RequestStockDialog from '../components/common/RequestStockDialog';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Typography, FormControl, Select,
  MenuItem, TextField, Chip, Tooltip, IconButton, Snackbar,
  InputAdornment, LinearProgress, Button, Avatar, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
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
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';

// Status chip config
const STATUS_CONFIG = {
  Stock: { label: 'STOCK IN', bg: '#DCFCE7', color: '#15803D' },
  Delivery: { label: 'DELIVERY (MACHINE)', bg: '#DBEAFE', color: '#1D4ED8' },
  'Stock Delivery': { label: 'STOCK DELIVERY', bg: '#FEF3C7', color: '#D97706' },
  Increase: { label: 'STOCK IN', bg: '#DCFCE7', color: '#15803D' },
  Decrease: { label: 'DELIVERY OUT', bg: '#FEE2E2', color: '#DC2626' },
  'Manual Edit': { label: 'CORRECTION', bg: '#FEF9C3', color: '#A16207' },
  Undo: { label: 'REVERSAL', bg: '#EDE9FE', color: '#7C3AED' },
  Rollback: { label: 'ROLLBACK', bg: '#FEE2E2', color: '#DC2626' },
  'Rolled Back': { label: 'ROLLED BACK', bg: '#F3F4F6', color: '#4B5563' }
};

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const StockHistory = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  // Rollback state
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [targetRollbackItem, setTargetRollbackItem] = useState(null);
  const [rollbackReasonInput, setRollbackReasonInput] = useState('History Deleted / Admin Rollback');
  const [rollbackLoading, setRollbackLoading] = useState(false);

  // Today stats (computed from current page data as approximation)
  const todayInflow = history.filter(h => (h.action === 'Increase' || h.action === 'Stock') && !h.is_rolled_back).reduce((s, h) => s + Math.abs((h.details?.quantity_changed) || (h.new_stock - h.old_stock) || 0), 0);
  const todayOutflow = history.filter(h => (h.action === 'Decrease' || h.action === 'Stock Delivery') && !h.is_rolled_back).reduce((s, h) => s + Math.abs((h.details?.quantity_changed) || (h.old_stock - h.new_stock) || 0), 0);
  const totalRollbacks = history.filter(h => h.action === 'Rollback' || h.is_rolled_back).length;

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

  const handleOpenRollbackModal = (item) => {
    setTargetRollbackItem(item);
    setRollbackReasonInput('History Deleted / Admin Rollback');
    setRollbackModalOpen(true);
  };

  const handleExecuteRollback = async () => {
    if (!targetRollbackItem) return;
    setRollbackLoading(true);
    try {
      const res = await stockAPI.rollback(targetRollbackItem.id, { reason: rollbackReasonInput });
      setSnack(res.data.message || 'Transaction successfully rolled back.');
      setRollbackModalOpen(false);
      setTargetRollbackItem(null);
      fetchHistory();
    } catch (err) {
      console.error('Rollback failed:', err);
      setSnack(err.response?.data?.error || 'Failed to rollback transaction.');
    } finally {
      setRollbackLoading(false);
    }
  };

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
      'Transaction ID': h.id,
      'Date': new Date(h.created_at).toLocaleDateString(),
      'Time': new Date(h.created_at).toLocaleTimeString(),
      'Saree': h.sarees?.sari_name || '',
      'Series Code': h.sarees?.series_code || h.series_code || '',
      'Beam': h.details?.beam_name || h.beam_name || '',
      'Combination': h.details?.combination_name || h.combination_name || '',
      'Opening Stock': h.old_stock,
      'Quantity': h.details?.quantity_changed ?? (h.new_stock - h.old_stock),
      'Closing Stock': h.new_stock,
      'Action': h.action,
      'Reason': h.details?.remarks || h.reason || '',
      'User': h.details?.user_name || h.changed_by_name || 'System',
      'Rollback Status': h.is_rolled_back ? 'Rolled Back' : (h.action === 'Rollback' ? 'Rollback Action' : 'Active'),
      'Rollback Date': h.rollback_date ? new Date(h.rollback_date).toLocaleString() : '',
      'Rollback By': h.rollback_by_name || '',
      'Rollback Reason': h.rollback_reason || ''
    }));
    const ws = xlsxUtils.json_to_sheet(rows);
    const wb = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(wb, ws, 'Audit Trail');
    xlsxWriteFile(wb, 'Stock_Rollback_Audit_Trail.xlsx');
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    };
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 1400, mx: 'auto' }}>
      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')} message={snack} />

      {/* ── Top Header Section ── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600, fontSize: { xs: '1.6rem', md: '2rem' }, color: 'text.primary', letterSpacing: '-0.02em' }}>
              Stock Audit & Rollback History
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.85rem' }}>
              Full operational ledger of warehouse movements, machine allocations, and administrator transaction rollbacks.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filter by Action */}
            <FormControl size="small">
              <Select
                value={action}
                onChange={e => { setAction(e.target.value); setPage(0); }}
                displayEmpty
                startAdornment={<FilterListIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />}
                sx={{ borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem', minWidth: 160, bgcolor: 'background.paper' }}
                renderValue={v => {
                  if (!v) return 'Active History Log';
                  if (v === 'all') return 'All (Including Rollbacks)';
                  if (v === 'Stock' || v === 'Increase') return 'Stock In';
                  if (v === 'Delivery') return 'Delivery (Machine)';
                  if (v === 'Stock Delivery' || v === 'Decrease') return 'Stock Delivery';
                  if (v === 'Rollback') return 'Rollback Logs';
                  if (v === 'Rolled Back') return 'Rolled Back Items';
                  if (v === 'Manual Edit') return 'Correction';
                  return v;
                }}
              >
                <MenuItem value="">Active Transactions Only</MenuItem>
                <MenuItem value="all">All (Including Rolled-back)</MenuItem>
                <MenuItem value="Stock">Stock In</MenuItem>
                <MenuItem value="Delivery">Delivery (Machine)</MenuItem>
                <MenuItem value="Stock Delivery">Stock Delivery (Customer)</MenuItem>
                <MenuItem value="Rollback">Rollback Logs</MenuItem>
                <MenuItem value="Rolled Back">Rolled-back Items</MenuItem>
                <MenuItem value="Manual Edit">Correction</MenuItem>
              </Select>
            </FormControl>

            {/* Export Report */}
            <Button variant="contained" startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />} onClick={handleExport}
              sx={{ borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', bgcolor: '#3B111A', '&:hover': { bgcolor: '#2A0B12' }, textTransform: 'none', px: 2.5 }}>
              Export Audit Report
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ── Search bar ── */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search audit logs by Saree, Beam, User, or Reason (Ctrl+K)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 440 }, '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'background.paper' } }}
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
                {['Date & Time', 'Saree Info', 'Beam / Combination', 'Opening → Closing Stock', 'Status / Action', 'Rollback Audit', 'Responsible User', 'Actions'].map(col => (
                  <TableCell key={col} align={col === 'Actions' ? 'center' : 'left'} sx={{ fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', py: 1.5, borderBottom: '2px solid', borderColor: 'divider' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
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
                
                const isMachineDelivery = item.action === 'Delivery' || (item.reason || '').includes('Machine Delivery') || (details.remarks || '').includes('Machine Delivery');
                const isStockDelivery = item.action === 'Stock Delivery' || (!isMachineDelivery && ((item.reason || '').includes('Stock Delivered') || item.action === 'Decrease'));
                const isStockIn = item.action === 'Stock' || (!isMachineDelivery && ((item.reason || '').includes('Stock In') || item.action === 'Increase'));
                const isRollback = item.action === 'Rollback';
                const isRolledBack = Boolean(item.is_rolled_back || item.is_undone);

                const reasonStr = (details.remarks || '') + ' ' + (item.reason || '');
                const matchPcs = reasonStr.match(/(\d+)\s*pcs/);
                let displayQtyLabel = '';
                if (isRollback) {
                  const rev = details.quantity_reversed;
                  displayQtyLabel = rev !== undefined ? `${rev > 0 ? '+' : ''}${rev}` : 'Rollback';
                } else if (isMachineDelivery) {
                  const qtyVal = matchPcs ? matchPcs[1] : (details.quantity_changed ? Math.abs(details.quantity_changed) : null);
                  displayQtyLabel = qtyVal ? `${qtyVal} pcs` : 'Machine';
                } else if (isStockDelivery) {
                  const qtyVal = matchPcs ? matchPcs[1] : Math.abs(item.new_stock - item.old_stock);
                  displayQtyLabel = `-${qtyVal}`;
                } else {
                  const qtyVal = matchPcs ? matchPcs[1] : Math.abs(item.new_stock - item.old_stock);
                  displayQtyLabel = `+${qtyVal}`;
                }

                let effectiveActionKey = item.action;
                if (isMachineDelivery) effectiveActionKey = 'Delivery';
                else if (isStockDelivery) effectiveActionKey = 'Stock Delivery';
                else if (isStockIn && item.action !== 'Manual Edit') effectiveActionKey = 'Stock';

                let statusCfg = STATUS_CONFIG[effectiveActionKey] || { label: item.action, bg: '#F3F4F6', color: '#374151' };
                if (isRolledBack) {
                  statusCfg = STATUS_CONFIG['Rolled Back'];
                }
                const userName = details.user_name || item.changed_by_name || 'System';
                const colors = item.combination_colors || details.colors || [];

                return (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{
                      opacity: isRolledBack ? 0.55 : 1,
                      bgcolor: isRolledBack ? 'rgba(0,0,0,0.02)' : (isRollback ? 'rgba(239,68,68,0.02)' : 'inherit'),
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                      transition: 'background 0.12s',
                    }}
                  >
                    {/* TRANSACTION & DATE */}
                    <TableCell sx={{ py: 2.5, pr: 1, width: 140, verticalAlign: 'top' }}>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', color: 'primary.main', mb: 0.5 }}>#{item.id?.slice(0, 8)}</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.3 }}>{date}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.2 }}>{time}</Typography>
                    </TableCell>

                    {/* SAREE INFO */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'top', width: 180 }}>
                      <Tooltip title="View Saree Details">
                        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', cursor: 'pointer' }}
                          onClick={() => handleNavigateToSaree(sId, sCode)}>
                          <Box sx={{ width: 38, height: 38, borderRadius: '6px', bgcolor: 'rgba(59,17,26,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', flexShrink: 0 }}>
                            🧵
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.3, '&:hover': { color: 'primary.main' } }}>{sCode || '—'}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{sName}</Typography>
                          </Box>
                        </Box>
                      </Tooltip>
                    </TableCell>

                    {/* BEAM / COMBINATION & COLOURS */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'top', width: 180 }}>
                      <Tooltip title="Create Stock Movement">
                        <Box sx={{ cursor: 'pointer' }} onClick={() => handleInitiateMovement(item)}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3, '&:hover': { color: 'primary.main' } }}>{bName}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 600 }}>{cName}</Typography>
                        </Box>
                      </Tooltip>
                      {colors && colors.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                          {colors.map((col, idx) => (
                            <Typography key={idx} variant="caption" sx={{
                              fontSize: '0.66rem', fontWeight: 700, px: 0.6, py: 0.1, borderRadius: '4px',
                              bgcolor: 'rgba(59,130,246,0.08)', color: '#1E40AF', border: '1px solid rgba(59,130,246,0.18)', whiteSpace: 'nowrap'
                            }}>
                              {col.f_number || `F-${idx+1}`}: {col.color_name}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </TableCell>

                    {/* ADJUSTMENT */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'top', width: 160 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: isRollback ? 'error.main' : isMachineDelivery ? 'primary.main' : isStockDelivery ? 'error.main' : 'success.main' }}>
                          {item.old_stock} → {item.new_stock}
                        </Typography>
                        <Chip
                          label={displayQtyLabel}
                          size="small"
                          sx={{
                            height: 20, fontSize: '0.65rem', fontWeight: 800, borderRadius: '4px',
                            bgcolor: isRollback ? 'rgba(239,68,68,0.15)' : isMachineDelivery ? 'rgba(37,99,235,0.12)' : isStockDelivery ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.15)',
                            color: isRollback ? '#DC2626' : isMachineDelivery ? '#2563EB' : isStockDelivery ? '#DC2626' : '#15803D',
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

                    {/* ROLLBACK AUDIT COLUMN */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'top', width: 170 }}>
                      {isRolledBack ? (
                        <Box>
                          <Chip label="ROLLED BACK" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: '#E5E7EB', color: '#374151', borderRadius: '4px', mb: 0.5 }} />
                          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.2 }}>
                            By: <b>{item.rollback_by_name || 'Admin'}</b>
                          </Typography>
                          {item.rollback_date && (
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                              {new Date(item.rollback_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </Typography>
                          )}
                          {item.rollback_reason && (
                            <Tooltip title={`Reason: ${item.rollback_reason}`}>
                              <Typography sx={{ fontSize: '0.68rem', color: 'error.main', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 150 }}>
                                "{item.rollback_reason}"
                              </Typography>
                            </Tooltip>
                          )}
                        </Box>
                      ) : isRollback ? (
                        <Box>
                          <Chip label="REVERSAL LOG" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: '#FEE2E2', color: '#DC2626', borderRadius: '4px', mb: 0.5 }} />
                          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                            Target Tx: #{item.rollback_transaction_id ? item.rollback_transaction_id.slice(0, 8) : 'Prev'}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>Active Transaction</Typography>
                      )}
                    </TableCell>

                    {/* RESPONSIBLE USER */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'top', width: 140 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#3B111A', color: '#fff' }}>
                          {getInitials(userName)}
                        </Avatar>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{userName}</Typography>
                      </Box>
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell sx={{ py: 2.5, verticalAlign: 'middle', width: 140, textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        {!isRolledBack && !isRollback && isAdmin ? (
                          <>
                            <Tooltip title="Rollback Transaction">
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<RotateLeftIcon sx={{ fontSize: 14 }} />}
                                onClick={() => handleOpenRollbackModal(item)}
                                sx={{ borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800, px: 1, py: 0.25, textTransform: 'none', height: 26 }}
                              >
                                Rollback
                              </Button>
                            </Tooltip>
                            <Tooltip title="Delete (Rollback)">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleOpenRollbackModal(item)}
                                sx={{ width: 26, height: 26, borderRadius: '6px', border: '1px solid', borderColor: 'error.light' }}
                              >
                                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <Chip
                            label={isRolledBack ? "ROLLED BACK" : isRollback ? "ROLLBACK LOG" : "LOCKED"}
                            size="small"
                            disabled
                            sx={{ fontSize: '0.6rem', fontWeight: 800, height: 22 }}
                          />
                        )}
                        <Tooltip title="Repeat via WhatsApp">
                          <IconButton
                            onClick={() => handleInitiateMovement(item)}
                            sx={{
                              width: 26, height: 26,
                              bgcolor: '#25D366',
                              borderRadius: '6px',
                              color: '#fff',
                              '&:hover': { bgcolor: '#1ebe57' }
                            }}
                          >
                            <WhatsAppIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
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
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'success.main' }}>Active Stock In</Typography>
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
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'error.main' }}>Stock Delivery</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Total Rollbacks */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
                Rollback Ledger
              </Typography>
              <Box sx={{ bgcolor: 'rgba(168,85,247,0.12)', p: 1, borderRadius: '8px', display: 'flex' }}>
                <RotateLeftIcon sx={{ fontSize: 20, color: '#A855F7' }} />
              </Box>
            </Box>
            <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 400, fontSize: '2.8rem', lineHeight: 1.2, mt: 1, mb: 0.5 }}>
              {totalRollbacks}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>Audited & Reversed</Typography>
              <Typography
                sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#A855F7', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => { setAction('Rollback'); setPage(0); }}
              >
                view logs
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Rollback Confirmation Dialog ── */}
      <Dialog
        open={rollbackModalOpen}
        onClose={() => !rollbackLoading && setRollbackModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '12px' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <RotateLeftIcon /> Rollback Transaction
        </DialogTitle>
        <DialogContent dividers>
          {targetRollbackItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(239,68,68,0.03)', borderColor: 'rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target History Transaction
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {targetRollbackItem.sarees?.series_code || targetRollbackItem.series_code} — {targetRollbackItem.details?.beam_name || targetRollbackItem.beam_name} ({targetRollbackItem.details?.combination_name || targetRollbackItem.combination_name})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip label={targetRollbackItem.action} size="small" sx={{ fontWeight: 800, bgcolor: '#3B111A', color: '#fff' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Recorded Stock: {targetRollbackItem.old_stock} → {targetRollbackItem.new_stock} pcs
                  </Typography>
                </Box>
              </Paper>

              <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  ROLLBACK ACTION SUMMARY:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                  Original Action: <b>{targetRollbackItem.action}</b>
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main', mt: 0.25 }}>
                  Rollback Action: Reverses stock and logs permanent audit trail entry
                </Typography>
              </Box>

              <TextField
                label="Rollback Reason"
                value={rollbackReasonInput}
                onChange={(e) => setRollbackReasonInput(e.target.value)}
                placeholder="Specify reason for rolling back this transaction..."
                fullWidth
                size="small"
                multiline
                rows={2}
                required
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRollbackModalOpen(false)} disabled={rollbackLoading} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleExecuteRollback}
            disabled={rollbackLoading || !rollbackReasonInput.trim()}
            startIcon={rollbackLoading ? <CircularProgress size={16} color="inherit" /> : <RotateLeftIcon />}
            sx={{ fontWeight: 800, borderRadius: '6px', px: 2.5 }}
          >
            {rollbackLoading ? 'Rolling back...' : 'Confirm Rollback'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Request Stock Dialog ── */}
      {selectedCombo && selectedSaree && (
        <RequestStockDialog
          open={requestDialogOpen}
          onClose={() => setRequestDialogOpen(false)}
          combination={selectedCombo}
          beamName={selectedBeam?.beam_name}
          seriesCode={selectedSaree?.series_code}
          sareeId={selectedSareeId}
          movementType={movementType}
          onSuccess={() => {
            fetchHistory();
            setSnack('Stock movement initiated successfully!');
          }}
        />
      )}
    </Box>
  );
};

export default StockHistory;
