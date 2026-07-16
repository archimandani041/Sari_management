/**
 * Saree Details Page — V3 Hierarchical & Analytical
 * Premium control panel with interactive inventory adjustments, analytics charts, and a detailed audit timeline.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sareeAPI } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import RequestStockDialog from '../components/common/RequestStockDialog';
import { useDebouncedCallback } from '../hooks/useDebounce';
import {
  Box, Grid, Paper, Typography, Button, Chip, Divider, Card, CardContent,
  CardMedia, TextField, FormControl, InputLabel, Select, MenuItem, Alert,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead, IconButton,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, LinearProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  FiberNew as FiberNewIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  WhatsApp as WhatsAppIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';



const SareeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isStaff } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { addRecentlyViewed, toggleFavorite, isFavorite } = useApp();

  const [saree, setSaree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Next Series dialog
  const [seriesConfirmOpen, setSeriesConfirmOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [manualSeriesLetter, setManualSeriesLetter] = useState('');

  // Request Stock dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestCombo, setRequestCombo] = useState(null);
  const [requestBeamName, setRequestBeamName] = useState('');



  // Delete dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const fetchSareeDetails = async () => {
    try {
      const { data } = await sareeAPI.getById(id);
      setSaree(data.saree);
      addRecentlyViewed(data.saree);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch saree details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSareeDetails();
  }, [id]);

  // Debounced realtime callback to avoid rapid multiple fetches
  const handleRealtimeUpdate = useDebouncedCallback(() => {
    fetchSareeDetails();
  }, 300);

  // Real-time Supabase subscriptions
  useEffect(() => {
    if (!supabase || !id) return;

    const channel = supabase
      .channel(`realtime-saree-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combinations' }, () => {
        handleRealtimeUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beams' }, () => {
        handleRealtimeUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sarees', filter: `id=eq.${id}` }, () => {
        handleRealtimeUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, handleRealtimeUpdate]);



  const handleNextSeriesConfirm = async () => {
    try {
      const { data } = await sareeAPI.nextSeries(saree.id);
      setSeriesConfirmOpen(false);
      setSeriesDialogOpen(false);
      setActionSuccess(`Advanced series code to ${data.saree.series_code}`);
      enqueueSnackbar(`Advanced to series ${data.saree.series_code}`, { variant: 'success' });
      fetchSareeDetails();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to advance series.');
    }
  };

  const handleSetSeries = async (letter) => {
    if (!letter || letter.length !== 1) return;
    try {
      const { data } = await sareeAPI.setSeries(saree.id, { series_letter: letter.toUpperCase() });
      setSeriesDialogOpen(false);
      setManualSeriesLetter('');
      setActionSuccess(`Series code changed to ${data.saree.series_code}`);
      enqueueSnackbar(`Series changed to ${data.saree.series_code}`, { variant: 'success' });
      fetchSareeDetails();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to set series.');
    }
  };

  const handleUndoSeries = () => {
    if (!saree?.series_letter || saree.series_letter === 'A') return;
    const prevLetter = String.fromCharCode(saree.series_letter.charCodeAt(0) - 1);
    handleSetSeries(prevLetter);
  };

  const handleDeleteConfirm = async () => {
    try {
      await sareeAPI.delete(saree.id);
      setDeleteConfirmOpen(false);
      setSnackbarMessage('Saree deleted successfully.');
      setSnackbarOpen(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete saree.');
    }
  };



  if (loading && !saree) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!saree) return <Box sx={{ p: 3 }}><Alert severity="error">Saree details not found.</Alert></Box>;

  // Calculations
  const totalStock = (saree.beams || []).reduce((sum, b) =>
    sum + (b.combinations || []).reduce((cs, c) => cs + (c.current_stock || 0), 0), 0
  );
  const minStock = (saree.beams || []).reduce((min, b) =>
    Math.min(min, ...(b.combinations || []).map(c => c.minimum_stock || 20)), 20
  );

  const getStockStatus = (total, min) => {
    if (total === 0) return { label: 'OUT OF STOCK', color: 'error', bg: 'rgba(239, 68, 68, 0.08)' };
    if (total <= min) return { label: 'LOW STOCK', color: 'warning', bg: 'rgba(245, 158, 11, 0.08)' };
    return { label: 'HEALTHY', color: 'success', bg: 'rgba(16, 185, 129, 0.08)' };
  };
  const statusInfo = getStockStatus(totalStock, minStock);



  return (
    <Box className="printable-area" sx={{ position: 'relative' }}>
      {loading && saree && (
        <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, height: 3, borderRadius: 1.5 }} />
      )}
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, displayPrint: 'none' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/sarees')} color="primary"><ArrowBackIcon /></IconButton>
          <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {saree.sari_name || 'Unnamed Saree'}
          </Typography>
          <Chip label={saree.series_code} color="primary" sx={{ fontWeight: 700 }} />
          {Array.from(new Set(saree.beams?.flatMap(b => b.combinations?.map(c => c.brand).filter(Boolean)) || [])).map(b => (
            <Chip key={b} label={b} color="secondary" size="small" sx={{ fontWeight: 700 }} />
          ))}
          {Array.from(new Set(saree.beams?.flatMap(b => b.combinations?.map(c => c.status).filter(Boolean)) || [])).map(s => (
            <Chip
              key={s}
              label={s}
              variant="outlined"
              color={s === 'In Stock' ? 'success' : 'info'}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          ))}
          <IconButton onClick={() => toggleFavorite(saree.id)} color="error">
            {isFavorite(saree.id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>Print Stock Sheet</Button>
          {(isAdmin || isStaff) && (
            <>
              <Button variant="outlined" color="secondary" startIcon={<FiberNewIcon />} onClick={() => { setManualSeriesLetter(saree?.series_letter || 'A'); setSeriesDialogOpen(true); }}>Series Options</Button>
              <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/sarees/edit/${saree.id}`)}>Edit Saree</Button>
              <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteConfirmOpen(true)}>Delete Saree</Button>
            </>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, displayPrint: 'none' }}>{error}</Alert>}
      {actionSuccess && <Alert severity="success" sx={{ mb: 3, displayPrint: 'none' }}>{actionSuccess}</Alert>}



      {/* TAB 0: BEAMS & COMBINATIONS */}

      <Grid container spacing={3}>
        {/* Left column */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 4, overflow: 'hidden', mb: 3 }}>
            <CardMedia component="img" height={320} image={saree.image_url || '/placeholder-sari.png'} alt={saree.sari_name} sx={{ objectFit: 'cover' }} />
          </Card>

          <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Saree Info</Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow><TableCell sx={{ fontWeight: 700 }}>Series Code</TableCell><TableCell>{saree.series_code}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 700 }}>Brands</TableCell><TableCell>
                    {Array.from(new Set(saree.beams?.flatMap(b => b.combinations?.map(c => c.brand).filter(Boolean)) || [])).map(b => (
                      <Chip
                        key={b}
                        label={b}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          mr: 0.5,
                          bgcolor: b === 'KP' ? 'secondary.light' : 'warning.light',
                          color: b === 'KP' ? 'secondary.dark' : 'warning.dark'
                        }}
                      />
                    ))}
                  </TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 700 }}>Statuses</TableCell><TableCell>
                    {Array.from(new Set(saree.beams?.flatMap(b => b.combinations?.map(c => c.status).filter(Boolean)) || [])).map(s => (
                      <Chip
                        key={s}
                        label={s}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontWeight: 700,
                          mr: 0.5,
                          color: s === 'In Stock' ? 'success.main' : 'info.main',
                          borderColor: s === 'In Stock' ? 'success.main' : 'info.main'
                        }}
                      />
                    ))}
                  </TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 700 }}>Total Stock</TableCell><TableCell sx={{ fontWeight: 800 }}>{totalStock} pcs</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 700 }}>Price</TableCell><TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{saree.price != null ? `₹${Number(saree.price).toLocaleString('en-IN')}` : '—'}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 700 }}>Stock Status</TableCell><TableCell>
                    <Chip label={statusInfo.label} color={statusInfo.color} size="small" sx={{ bgcolor: statusInfo.bg, fontWeight: 700 }} />
                  </TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 700 }}>Beams</TableCell><TableCell>{saree.beams?.length || 0}</TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Right column */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Beams & Combinations</Typography>
            {saree.beams?.map((beam, bi) => (
              <Box key={beam.id} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>{beam.beam_name}</Typography>
                <Grid container spacing={2}>
                  {beam.combinations?.map((c, ci) => {
                    const isLow = (c.current_stock ?? 0) <= (c.minimum_stock ?? 20);
                    return (
                      <Grid size={12} key={c.id}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: isLow ? 'warning.light' : 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {c.combination_name || `Combination ${ci + 1}`}
                              </Typography>
                              <Chip
                                label={c.brand || 'KP'}
                                color="secondary"
                                size="small"
                                sx={{ fontWeight: 700, height: 20, fontSize: '0.65rem' }}
                              />
                              <Chip
                                label={c.status || 'In Stock'}
                                variant="outlined"
                                color={(c.status || 'In Stock') === 'In Stock' ? 'success' : 'info'}
                                size="small"
                                sx={{ fontWeight: 700, height: 20, fontSize: '0.65rem' }}
                              />
                              {c.notes && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', width: '100%' }}>Notes: {c.notes}</Typography>}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={`${c.current_stock} pcs`}
                                color={isLow ? (c.current_stock === 0 ? 'error' : 'warning') : 'primary'}
                                size="small"
                              />
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                startIcon={<WhatsAppIcon fontSize="small" />}
                                onClick={() => {
                                  setRequestCombo(c);
                                  setRequestBeamName(beam.beam_name);
                                  setRequestDialogOpen(true);
                                }}
                                sx={{ whiteSpace: 'nowrap', fontSize: '0.72rem' }}
                              >
                                Request Stock
                              </Button>

                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {c.combination_colors?.map((col) => (
                              <Chip key={col.id} label={`${col.f_number}: ${col.color_name} ${col.company_name ? `(${col.company_name})` : ''}`} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
                {bi < saree.beams.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>




      {/* Series Management Dialog */}
      <Dialog open={seriesDialogOpen} onClose={() => setSeriesDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', pb: 1 }}>Series Options</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>Current Series:</Typography>
            <Chip label={saree?.series_code} color="primary" sx={{ fontWeight: 700 }} />
          </Box>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Adjust the series letter (A-Z) for this saree. This affects the product catalog immediately.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                fullWidth 
                variant="outlined" 
                color="primary" 
                onClick={handleUndoSeries}
                disabled={!saree?.series_letter || saree.series_letter === 'A'}
                sx={{ height: 48, fontWeight: 700 }}
              >
                Undo Series
              </Button>
              <Button 
                fullWidth 
                variant="contained" 
                color="primary" 
                onClick={() => setSeriesConfirmOpen(true)}
                disabled={saree?.series_letter === 'Z'}
                sx={{ height: 48, fontWeight: 700 }}
              >
                Next Series
              </Button>
            </Box>
            
            <Divider sx={{ my: 1 }}>OR SET MANUALLY</Divider>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Series Letter"
                fullWidth
                value={manualSeriesLetter}
                onChange={(e) => setManualSeriesLetter(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1))}
                placeholder="A-Z"
                inputProps={{ maxLength: 1, style: { textAlign: 'center', fontWeight: 'bold' } }}
              />
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={() => handleSetSeries(manualSeriesLetter)}
                disabled={!manualSeriesLetter || manualSeriesLetter === saree?.series_letter}
                sx={{ px: 4 }}
              >
                Apply
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ pt: 2 }}>
          <Button onClick={() => setSeriesDialogOpen(false)} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Legacy Next Series Confirmation (Triggered from new dialog) */}
      <Dialog open={seriesConfirmOpen} onClose={() => setSeriesConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Next Series</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to advance this saree series? This increments the letter (e.g. A → B).</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setSeriesConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleNextSeriesConfirm} variant="contained" color="primary">Advance Series</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', pb: 1 }}>Delete Saree</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
              Sari Number:
            </Typography>
            <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800 }}>
              {saree?.series_code}
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
          <Button onClick={() => setDeleteConfirmOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete Permanently</Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={snackbarOpen}
        onClose={() => {
          setSnackbarOpen(false);
          navigate('/sarees');
        }}
        PaperProps={{ sx: { p: 1, borderRadius: 2 } }}
      >
        <DialogContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{snackbarMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSnackbarOpen(false);
              navigate('/sarees');
            }}
            variant="contained"
            color="primary"
          >
            Ok
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Stock Dialog component */}
      {requestCombo && (
        <RequestStockDialog
          open={requestDialogOpen}
          onClose={() => {
            setRequestDialogOpen(false);
            setRequestCombo(null);
          }}
          seriesCode={saree.series_code}
          sareeId={saree.id}
          beamName={requestBeamName}
          combination={requestCombo}
          onSuccess={() => {
            enqueueSnackbar('Stock request sent via WhatsApp!', { variant: 'success' });
            fetchSareeDetails();
          }}
        />
      )}
    </Box>
  );
};

export default SareeDetail;
