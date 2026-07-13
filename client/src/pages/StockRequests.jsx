/**
 * Stock Requests — Visual Pipeline (spec §13)
 * Shows a progress stepper (Requested → Confirmed → Received) per request card.
 * Elevated to match the luxury catalog design system (deep burgundy highlights, 8px borders, clean flat surfaces).
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#EF4444' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cancelled</Typography>
      </Box>
    );
  }
  const currentIdx = PIPELINE_STEPS.indexOf(currentStatus);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
      {PIPELINE_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        let dotColor = '#EAE6E1';
        if (active) dotColor = STATUS_COLORS[step];
        else if (done) dotColor = '#241C1A';

        return (
          <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: dotColor,
                transition: 'bgcolor 0.2s ease',
              }} />
              <Typography variant="caption" sx={{
                fontWeight: active ? 750 : (done ? 600 : 500),
                color: active ? 'text.primary' : 'text.secondary',
                fontSize: '0.75rem',
              }}>
                {step}
              </Typography>
            </Box>
            {idx < PIPELINE_STEPS.length - 1 && (
              <Box sx={{ width: { xs: 20, sm: 40 }, height: 1, bgcolor: '#EAE6E1' }} />
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
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1, md: 3 }, py: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: '2.5rem', fontWeight: 800, mb: 1, letterSpacing: '-0.02em', color: '#241C1A' }}>
            Stock Requests
          </Typography>
          <Typography variant="body1" sx={{ color: '#7C726A', fontSize: '0.95rem' }}>
            Track supplier orders from request to receipt
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="filter-status-label" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter Status</InputLabel>
          <Select
            labelId="filter-status-label"
            value={statusFilter}
            label="Filter Status"
            onChange={e => setStatusFilter(e.target.value)}
            sx={{
              borderRadius: '6px',
              bgcolor: '#FFFFFF',
              borderColor: '#EAE6E1',
              fontSize: '0.85rem',
              fontWeight: 650,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#EAE6E1' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#AC9E7A' },
            }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="Requested">Requested</MenuItem>
            <MenuItem value="Confirmed">Confirmed</MenuItem>
            <MenuItem value="Received">Received</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Stats pills — redesigned as clean catalog stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {Object.entries(stats).map(([status, count]) => {
          const isFilterActive = statusFilter === status;
          return (
            <Grid item xs={6} sm={3} key={status}>
              <Paper
                onClick={() => setStatusFilter(isFilterActive ? '' : status)}
                sx={{
                  p: 2.5,
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: isFilterActive ? '1px solid #3B111A' : '1px solid #EAE6E1',
                  bgcolor: '#FAF8F5',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#3B111A',
                    bgcolor: '#FFFFFF'
                  }
                }}
              >
                <Typography
                  variant="h2"
                  sx={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontWeight: 450,
                    fontSize: '2.2rem',
                    mb: 0.5,
                    color: '#241C1A'
                  }}
                >
                  {count}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 750,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontSize: '0.68rem',
                    color: '#7C726A'
                  }}
                >
                  {status}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}

      {loading && requests.length > 0 && (
        <LinearProgress sx={{ height: 2, mb: 3, bgcolor: '#FAF8F5', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }} />
      )}

      {/* Request cards */}
      {loading && requests.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={130} sx={{ borderRadius: '8px', bgcolor: '#FAF8F5' }} />)}
        </Box>
      ) : requests.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: '8px', textAlign: 'center', border: '1px solid #EAE6E1', bgcolor: '#FFFFFF', boxShadow: 'none' }}>
          <HistoryIcon sx={{ fontSize: 40, color: '#AC9E7A', mb: 1.5 }} />
          <Typography sx={{ color: '#7C726A', fontWeight: 600 }}>No stock requests yet.</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {requests.map(req => {
            const movementLabel = getMovementLabel(req);
            const isDelivery = movementLabel === 'Delivery Out';

            return (
              <Paper
                key={req.id}
                sx={{
                  p: 3,
                  borderRadius: '8px',
                  border: '1px solid #EAE6E1',
                  bgcolor: '#FFFFFF',
                  boxShadow: 'none',
                  transition: 'border-color 0.2s ease',
                  '&:hover': { borderColor: '#AC9C94' }
                }}
              >
                {/* Top row: Stepper + Date */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                  <PipelineStepper currentStatus={req.status} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#7C726A', fontSize: '0.8rem' }}>
                    {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(req.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Typography>
                </Box>

                {/* Details grid layout matching design */}
                <Grid container spacing={2} sx={{ mb: 2.5 }}>
                  <Grid item xs={12} md={7}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Typography
                        variant="h3"
                        sx={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color: '#241C1A',
                          fontFamily: '"Plus Jakarta Sans", sans-serif'
                        }}
                      >
                        {req.series_code}
                      </Typography>
                      <Chip
                        label={movementLabel.toUpperCase()}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          borderRadius: '3px',
                          bgcolor: isDelivery ? '#FFF3E0' : '#E2F6EA',
                          color: isDelivery ? '#D97706' : '#16A34A',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#7C726A', fontWeight: 550 }}>
                      {req.beam_name} · {req.combination_name || 'Combination'}
                    </Typography>
                  </Grid>

                  {/* Quantity and Supplier columns */}
                  <Grid item xs={6} md={2.5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'center' } }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9E8E7A', display: 'block', mb: 0.5 }}>
                        QTY
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{
                          fontFamily: '"Playfair Display", Georgia, serif',
                          fontWeight: 700,
                          fontSize: '1.4rem',
                          color: isDelivery ? '#D97706' : '#16A34A'
                        }}
                      >
                        {isDelivery ? '−' : '+'}{req.requested_qty}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={2.5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'center' } }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9E8E7A', display: 'block', mb: 0.5 }}>
                        SUPPLIER
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{
                          fontFamily: '"Playfair Display", Georgia, serif',
                          fontWeight: 700,
                          fontSize: '1.35rem',
                          color: '#241C1A'
                        }}
                      >
                        {req.suppliers?.name || '—'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Actions row */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', pt: 1.5, borderTop: '1px solid #FAF8F5' }}>
                  {req.status !== 'Received' && req.status !== 'Cancelled' && (
                    <>
                      {req.suppliers?.mobile && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<WhatsAppIcon sx={{ fontSize: 16 }} />}
                          onClick={() => openWhatsApp(req)}
                          sx={{
                            fontWeight: 800,
                            borderRadius: '4px',
                            borderColor: '#16A34A',
                            color: '#16A34A',
                            px: 2,
                            py: 0.8,
                            fontSize: '0.78rem',
                            '&:hover': {
                              borderColor: '#15803d',
                              bgcolor: 'rgba(22,163,74,0.04)'
                            }
                          }}
                        >
                          WhatsApp
                        </Button>
                      )}
                      {req.status === 'Requested' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleStatusChange(req.id, 'Confirmed')}
                          sx={{
                            fontWeight: 800,
                            borderRadius: '4px',
                            borderColor: '#EAE6E1',
                            color: '#241C1A',
                            px: 2,
                            py: 0.8,
                            fontSize: '0.78rem',
                            '&:hover': {
                              borderColor: '#9E8E7A',
                              bgcolor: '#FCFCFA'
                            }
                          }}
                        >
                          Confirm
                        </Button>
                      )}
                      {(req.status === 'Requested' || req.status === 'Confirmed') && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleStatusChange(req.id, 'Received')}
                          sx={{
                            fontWeight: 800,
                            borderRadius: '4px',
                            bgcolor: '#3B111A',
                            color: '#FFFFFF',
                            px: 2.5,
                            py: 0.8,
                            fontSize: '0.78rem',
                            '&:hover': {
                              bgcolor: '#2A0B12'
                            }
                          }}
                        >
                          Mark Received
                        </Button>
                      )}
                    </>
                  )}
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteId(req.id)}
                      sx={{
                        ml: 'auto',
                        color: '#DC2626',
                        border: '1px solid #FEEBEE',
                        borderRadius: '4px',
                        '&:hover': { bgcolor: '#FEEBEE' }
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Receive confirmation dialog (spec §13) */}
      <Dialog open={!!receiveConfirm} onClose={() => setReceiveConfirm(null)} PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#241C1A' }}>
          Confirm Stock Receipt
        </DialogTitle>
        <DialogContent>
          {receiveConfirm && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                {receiveConfirm.series_code} — {receiveConfirm.beam_name} · {receiveConfirm.combination_name}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: '#FAF8F5', borderRadius: '4px', border: '1px solid #EAE6E1' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#7C726A', fontWeight: 550 }}>Current Stock</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#241C1A' }}>{receiveConfirm.current_stock ?? '—'} pcs</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#7C726A', fontWeight: 550 }}>Receiving</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#16A34A' }}>+{receiveConfirm.requested_qty} pcs</Typography>
                </Box>
                <Box sx={{ borderTop: '1px solid #EAE6E1', pt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#241C1A' }}>New Stock</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#241C1A' }}>{(receiveConfirm.current_stock ?? 0) + receiveConfirm.requested_qty} pcs</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setReceiveConfirm(null)} variant="outlined" sx={{ borderRadius: '4px', textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button onClick={confirmReceive} variant="contained" sx={{ borderRadius: '4px', bgcolor: '#3B111A', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#2A0B12' } }}>
            Confirm & Update Stock
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: '8px' } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#241C1A' }}>Delete Request?</DialogTitle>
        <DialogContent sx={{ color: '#7C726A' }}>This will permanently delete the stock request record.</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteId(null)} variant="outlined" sx={{ borderRadius: '4px', textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ borderRadius: '4px', textTransform: 'none', fontWeight: 700, bgcolor: '#DC2626' }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
};

export default StockRequests;
