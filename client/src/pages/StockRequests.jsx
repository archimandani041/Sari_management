/**
 * Stock Requests Page
 * Purchase request history with status management
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, Alert, Skeleton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Grid
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HistoryIcon from '@mui/icons-material/History';
import { stockRequestAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS = { Requested: 'warning', Confirmed: 'info', Received: 'success', Cancelled: 'error' };
const STATUS_ICONS = { Requested: <HistoryIcon fontSize="small" />, Confirmed: <CheckCircleIcon fontSize="small" />, Received: <LocalShippingIcon fontSize="small" />, Cancelled: <CancelIcon fontSize="small" /> };

const StockRequests = () => {
  const { isAdmin, isStaff } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [snack, setSnack] = useState('');
  const [error, setError] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await stockRequestAPI.getAll({ status: statusFilter });
      setRequests(data.requests || []);
    } catch (e) {
      setError('Failed to load stock requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await stockRequestAPI.updateStatus(id, { status: newStatus });
      setSnack(`Status updated to ${newStatus}`);
      fetchRequests();
    } catch (e) {
      setError('Failed to update status');
    }
  };

  const handleDelete = async () => {
    try {
      await stockRequestAPI.delete(deleteId);
      setDeleteId(null);
      setSnack('Request deleted');
      fetchRequests();
    } catch (e) {
      setError('Failed to delete request');
    }
  };

  const openWhatsApp = (req) => {
    const mobile = (req.suppliers?.mobile || '').replace(/\D/g, '');
    if (!mobile) return;
    const msg = req.whatsapp_message || '';
    window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Stats
  const stats = { Requested: 0, Confirmed: 0, Received: 0, Cancelled: 0 };
  requests.forEach(r => { if (stats[r.status] !== undefined) stats[r.status]++; });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>Stock Requests</Typography>
          <Typography variant="subtitle1" color="text.secondary">Purchase request history via WhatsApp</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select value={statusFilter} label="Filter by Status" onChange={e => setStatusFilter(e.target.value)}>
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="Requested">Requested</MenuItem>
            <MenuItem value="Confirmed">Confirmed</MenuItem>
            <MenuItem value="Received">Received</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(stats).map(([status, count]) => (
          <Grid size={{ xs: 6, sm: 3 }} key={status}>
            <Paper sx={{ p: 2, borderRadius: 3, textAlign: 'center', cursor: 'pointer', border: '1.5px solid', borderColor: statusFilter === status ? 'primary.main' : 'divider', bgcolor: statusFilter === status ? 'sidebar.active' : 'background.paper', transition: 'all 0.15s', '&:hover': { borderColor: 'primary.light', transform: 'translateY(-2px)' } }}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>{count}</Typography>
              <Chip label={status} color={STATUS_COLORS[status]} size="small" sx={{ fontWeight: 700 }} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sari / Beam / Combo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6].map(j => <TableCell key={j}><Skeleton /></TableCell>)}
                  </TableRow>
                ))
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No stock requests yet.</Typography>
                  </TableCell>
                </TableRow>
              ) : requests.map(req => (
                <TableRow key={req.id} hover>
                  <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{req.series_code}</Typography>
                      {req.notes?.startsWith('DELIVERY_OUT') ? (
                        <Chip label="Delivery Out" size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                      ) : (
                        <Chip label="Stock In" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {req.beam_name} · {req.combination_name || 'Combination'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{req.suppliers?.name || '—'}</Typography>
                    {req.suppliers?.company_name && (
                      <Typography variant="caption" color="text.secondary">{req.suppliers.company_name}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${req.notes?.startsWith('DELIVERY_OUT') ? '-' : '+'}${req.requested_qty} pcs`}
                      size="small"
                      color={req.notes?.startsWith('DELIVERY_OUT') ? 'warning' : 'primary'}
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {(isAdmin || isStaff) ? (
                      <Select
                        value={req.status} size="small" variant="outlined"
                        onChange={e => handleStatusChange(req.id, e.target.value)}
                        sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.78rem' } }}
                        renderValue={v => (
                          <Chip label={v} color={STATUS_COLORS[v]} size="small" sx={{ fontWeight: 700, height: 22 }} />
                        )}
                      >
                        {['Requested', 'Confirmed', 'Received', 'Cancelled'].map(s => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <Chip label={req.status} color={STATUS_COLORS[req.status]} size="small" sx={{ fontWeight: 700 }} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {req.suppliers?.mobile && (
                      <Tooltip title="Resend via WhatsApp">
                        <IconButton size="small" color="success" onClick={() => openWhatsApp(req)}>
                          <WhatsAppIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(isAdmin || isStaff) && (
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(req.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Request?</DialogTitle>
        <DialogContent>This will permanently delete the stock request record.</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
};

export default StockRequests;
