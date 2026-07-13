/**
 * Stock Requests — Visual Pipeline (spec §13)
 * Shows a progress stepper (Requested → Confirmed → Received) per request card.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Chip, Select, MenuItem, FormControl, InputLabel,
  IconButton, Tooltip, Alert, Skeleton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Grid, LinearProgress
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HistoryIcon from '@mui/icons-material/History';
import { stockRequestAPI } from '../services/api';
import { MOVEMENT_LABELS } from '../constants/terms';

const PIPELINE_STEPS = ['Requested', 'Confirmed', 'Received'];
const STATUS_COLORS = { Requested: '#F59E0B', Confirmed: '#38BDF8', Received: '#22C55E', Cancelled: '#EF4444' };

const PipelineStepper = ({ currentStatus }) => {
  if (currentStatus === 'Cancelled') {
    return (
      <Chip label="Cancelled" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.12)', color: 'error.main', fontWeight: 700, fontSize: '0.72rem' }} />
    );
  }
  const currentIdx = PIPELINE_STEPS.indexOf(currentStatus);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {PIPELINE_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
              width: active ? 10 : 8,
              height: active ? 10 : 8,
              borderRadius: '50%',
              bgcolor: done ? STATUS_COLORS[step] : 'action.disabled',
              transition: 'all 0.2s',
              boxShadow: active ? `0 0 0 3px ${STATUS_COLORS[step]}30` : 'none'
            }} />
            <Typography variant="caption" sx={{
              fontWeight: done ? 700 : 500,
              color: done ? 'text.primary' : 'text.disabled',
              fontSize: '0.68rem'
            }}>
              {step}
            </Typography>
            {idx < PIPELINE_STEPS.length - 1 && (
              <Box sx={{ width: 20, height: 2, bgcolor: idx < currentIdx ? STATUS_COLORS[PIPELINE_STEPS[idx + 1]] : 'action.disabled', borderRadius: 1, mx: 0.25 }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

const StockRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [receiveConfirm, setReceiveConfirm] = useState(null);
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
    // If marking as Received, show confirmation first
    if (newStatus === 'Received') {
      const req = requests.find(r => r.id === id);
      setReceiveConfirm(req);
      return;
    }
    try {
      await stockRequestAPI.updateStatus(id, { status: newStatus });
      setSnack(`Status updated to ${newStatus}`);
      fetchRequests();
    } catch (e) {
      setError('Failed to update status');
    }
  };

  const confirmReceive = async () => {
    if (!receiveConfirm) return;
    try {
      await stockRequestAPI.updateStatus(receiveConfirm.id, { status: 'Received' });
      setSnack('Marked as Received — stock updated');
      setReceiveConfirm(null);
      fetchRequests();
    } catch (e) {
      setError('Failed to mark as received');
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

  const getMovementLabel = (req) => {
    if (req.movement_type === 'DELIVERY_OUT' || req.notes?.startsWith('DELIVERY_OUT')) return 'Delivery Out';
    return 'Stock In';
  };

  // Stats
  const stats = { Requested: 0, Confirmed: 0, Received: 0, Cancelled: 0 };
  requests.forEach(r => { if (stats[r.status] !== undefined) stats[r.status]++; });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Stock Requests</Typography>
          <Typography variant="body1" color="text.secondary">Track supplier orders from request to receipt</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Filter</InputLabel>
          <Select value={statusFilter} label="Filter" onChange={e => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Requested">Requested</MenuItem>
            <MenuItem value="Confirmed">Confirmed</MenuItem>
            <MenuItem value="Received">Received</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Stats pills */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {Object.entries(stats).map(([status, count]) => (
          <Grid size={{ xs: 6, sm: 3 }} key={status}>
            <Paper
              sx={{
                p: 2, borderRadius: 3, textAlign: 'center', cursor: 'pointer',
                border: '1.5px solid', borderColor: statusFilter === status ? STATUS_COLORS[status] : 'divider',
                transition: 'all 0.15s', '&:hover': { transform: 'translateY(-2px)' }
              }}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            >
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, color: STATUS_COLORS[status] }}>{count}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{status}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {loading && requests.length > 0 && (
        <LinearProgress sx={{ height: 3, mb: 2.5, borderRadius: 1.5 }} />
      )}
      {/* Request cards */}
      {loading && requests.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1,2,3].map(i => <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3 }} />)}
        </Box>
      ) : requests.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 3, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No stock requests yet.</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {requests.map(req => {
            const movementLabel = getMovementLabel(req);
            const isDelivery = movementLabel === 'Delivery Out';

            return (
              <Paper key={req.id} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', transition: 'box-shadow 0.15s', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } }}>
                {/* Top row: pipeline + date */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <PipelineStepper currentStatus={req.status} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(req.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>

                {/* Details */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{req.series_code}</Typography>
                      <Chip
                        label={movementLabel}
                        size="small"
                        sx={{
                          height: 20, fontSize: '0.65rem', fontWeight: 700,
                          bgcolor: isDelivery ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                          color: isDelivery ? 'warning.dark' : 'success.dark'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {req.beam_name} · {req.combination_name || 'Combination'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Qty</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: isDelivery ? 'warning.main' : 'success.main' }}>
                        {isDelivery ? '−' : '+'}{req.requested_qty}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>Supplier</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{req.suppliers?.name || '—'}</Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {req.status !== 'Received' && req.status !== 'Cancelled' && (
                    <>
                      {req.suppliers?.mobile && (
                        <Button size="small" variant="outlined" color="success" startIcon={<WhatsAppIcon />} onClick={() => openWhatsApp(req)} sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', fontSize: '0.75rem' }}>
                          WhatsApp
                        </Button>
                      )}
                      {req.status === 'Requested' && (
                        <Button size="small" variant="outlined" onClick={() => handleStatusChange(req.id, 'Confirmed')} sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', fontSize: '0.75rem' }}>
                          Confirm
                        </Button>
                      )}
                      {(req.status === 'Requested' || req.status === 'Confirmed') && (
                        <Button size="small" variant="contained" startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />} onClick={() => handleStatusChange(req.id, 'Received')} sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', fontSize: '0.75rem' }}>
                          Mark Received
                        </Button>
                      )}
                    </>
                  )}
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => setDeleteId(req.id)} sx={{ ml: 'auto' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Receive confirmation dialog (spec §13) */}
      <Dialog open={!!receiveConfirm} onClose={() => setReceiveConfirm(null)} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Stock Receipt</DialogTitle>
        <DialogContent>
          {receiveConfirm && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                {receiveConfirm.series_code} — {receiveConfirm.beam_name} · {receiveConfirm.combination_name}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Current Stock</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{receiveConfirm.current_stock ?? '—'} pcs</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Receiving</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>+{receiveConfirm.requested_qty} pcs</Typography>
                </Box>
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>New Stock</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{(receiveConfirm.current_stock ?? 0) + receiveConfirm.requested_qty} pcs</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setReceiveConfirm(null)} variant="outlined">Cancel</Button>
          <Button onClick={confirmReceive} variant="contained">Confirm & Update Stock</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
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
