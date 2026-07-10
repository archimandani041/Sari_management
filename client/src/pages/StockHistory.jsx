/**
 * Stock History Audit Trail Page
 * Complete log of all stock adjustments, changes, and user attributions with JSON metadata.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI, sareeAPI } from '../services/api';
import RequestStockDialog from '../components/common/RequestStockDialog';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Typography, FormControl, InputLabel, Select,
  MenuItem, Grid, TextField, Chip, CircularProgress, Tooltip, IconButton, Snackbar,
  InputAdornment, LinearProgress, Button
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

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

  // States for opening the WhatsApp Dialog
  const [selectedSaree, setSelectedSaree] = useState(null);
  const [selectedSareeId, setSelectedSareeId] = useState('');
  const [selectedBeam, setSelectedBeam] = useState(null);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [movementType, setMovementType] = useState('STOCK_IN');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [snack, setSnack] = useState('');

  // Handle debouncing of search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        action: action || undefined,
        search: debouncedSearch || undefined
      };
      const { data } = await stockAPI.getHistory(params);
      setHistory(data.history || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, action, debouncedSearch]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Navigates to Saree Detail Page using Series Code resolution if needed
  const handleNavigateToSaree = async (sareeId, seriesCode) => {
    if (sareeId) {
      navigate(`/sarees/${sareeId}`);
      return;
    }
    if (!seriesCode) return;
    try {
      const { data } = await sareeAPI.getAll({ search: seriesCode });
      const matched = data.sarees?.find(s => s.series_code === seriesCode);
      if (matched) {
        navigate(`/sarees/${matched.id}`);
      } else {
        setSnack('Saree details are no longer available.');
      }
    } catch (err) {
      console.error(err);
      setSnack('Saree details are no longer available.');
    }
  };

  // Initiates Stock Movement by resolving the latest Combination data
  const handleInitiateMovement = async (item) => {
    let sareeId = item.saree_id;
    const seriesCode = item.series_code || item.sarees?.series_code;
    const beamName = item.beam_name || item.details?.beam_name;
    const comboName = item.combination_name || item.details?.combination_name;

    // 1. Resolve Saree ID if missing
    if (!sareeId && seriesCode) {
      try {
        const { data } = await sareeAPI.getAll({ search: seriesCode });
        const matched = data.sarees?.find(s => s.series_code === seriesCode);
        if (matched) {
          sareeId = matched.id;
        }
      } catch (err) {
        console.error('Failed to resolve Saree ID:', err);
      }
    }

    if (!sareeId) {
      setSnack('This Combination is no longer available.');
      return;
    }

    // 2. Fetch the latest Saree data (Beams, Combinations, Colors, Stock)
    try {
      const { data } = await sareeAPI.getById(sareeId);
      const saree = data.saree;
      if (!saree) {
        setSnack('This Combination is no longer available.');
        return;
      }

      // Find the matched Beam
      const matchedBeam = saree.beams?.find(b => b.beam_name === beamName);
      if (!matchedBeam) {
        setSnack('This Combination is no longer available.');
        return;
      }

      // Find the matched Combination
      const matchedCombo = matchedBeam.combinations?.find(c => c.combination_name === comboName);
      if (!matchedCombo) {
        setSnack('This Combination is no longer available.');
        return;
      }

      // Pre-fill and open dialog
      setSelectedSaree(saree);
      setSelectedSareeId(sareeId);
      setSelectedBeam(matchedBeam);
      setSelectedCombo(matchedCombo);
      setMovementType(item.action === 'Decrease' ? 'DELIVERY_OUT' : 'STOCK_IN');
      setRequestDialogOpen(true);
    } catch (err) {
      console.error(err);
      setSnack('This Combination is no longer available.');
    }
  };

  const isFirstLoad = loading && history.length === 0;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
          Stock Transaction History
        </Typography>
        <Typography variant="subtitle1">
          Complete immutable audit trail of all inventory adjustments
        </Typography>
      </Box>

      {/* Filter Options */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Filter by Action</InputLabel>
              <Select
                value={action}
                label="Filter by Action"
                onChange={(e) => { setAction(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="Increase">Stock In</MenuItem>
                <MenuItem value="Decrease">Delivery Out</MenuItem>
                <MenuItem value="Manual Edit">Correction</MenuItem>
                <MenuItem value="Undo">Reversal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 5 }}>
            <TextField
              fullWidth
              label="Search keyword"
              placeholder="Search by Saree name or series code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Active Filter Feedback */}
      {(debouncedSearch || action) && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {total} {action ? `${action === 'Increase' ? 'Stock In' : action === 'Decrease' ? 'Delivery Out' : action === 'Manual Edit' ? 'Correction' : action === 'Undo' ? 'Reversal' : action} ` : ''}transaction{total !== 1 ? 's' : ''}
            {debouncedSearch ? ` for "${debouncedSearch}"` : ''}
          </Typography>
        </Box>
      )}

      {/* Transactions Table */}
      {isFirstLoad ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}>
              <LinearProgress color="primary" />
            </Box>
          )}
          <Table size="small" sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Saree Info</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Beam / Combination</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Adjustment</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action Details</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ERP Metadata & Notes</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Responsible User</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => {
                const details = item.details || {};
                const sId = item.saree_id;
                const sCode = item.sarees?.series_code || item.series_code;
                const bName = details.beam_name || item.beam_name;
                const cName = details.combination_name || item.combination_name;

                return (
                  <TableRow key={item.id} hover sx={{ opacity: item.is_undone ? 0.5 : 1 }}>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{new Date(item.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Tooltip title="View Saree Details">
                        <Box
                          component="span"
                          onClick={() => handleNavigateToSaree(sId, sCode)}
                          sx={{
                            cursor: 'pointer',
                            fontWeight: 700,
                            display: 'inline-block',
                            '&:hover': {
                              textDecoration: 'underline',
                              color: 'primary.main'
                            }
                          }}
                        >
                          {item.sarees?.sari_name || '—'}
                          <Typography variant="caption" display="block" color="text.secondary">
                            Code: {sCode || '—'}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Create Stock Movement">
                        <Box
                          component="div"
                          onClick={() => handleInitiateMovement(item)}
                          sx={{
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            '&:hover': {
                              textDecoration: 'underline',
                              color: 'primary.main'
                            }
                          }}
                        >
                          {bName || '—'}
                          <Typography variant="caption" display="block" color="text.secondary">
                            Combo: {cName || '—'}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {item.old_stock} → {item.new_stock}
                      <Typography variant="caption" display="block" color="text.secondary">
                        Change: {details.quantity_changed >= 0 ? `+${details.quantity_changed}` : details.quantity_changed}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.action === 'Increase' ? 'Stock In' : item.action === 'Decrease' ? 'Delivery Out' : item.action === 'Manual Edit' ? 'Correction' : item.action === 'Undo' ? 'Reversal' : item.action}
                        size="small"
                        color={
                          item.action === 'Increase' ? 'success' :
                            item.action === 'Decrease' ? 'error' :
                              item.action === 'Undo' ? 'warning' : 'default'
                        }
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', maxWidth: 300 }}>
                      {details.reason_category && (
                        <Typography variant="caption" display="block">
                          <strong>Category:</strong> {details.reason_category}
                        </Typography>
                      )}
                      {details.movement_type && (
                        <Typography variant="caption" display="block">
                          <strong>Movement Type:</strong> {details.movement_type === 'STOCK_IN' ? 'Stock In' : details.movement_type === 'DELIVERY_OUT' ? 'Delivery Out' : details.movement_type}
                        </Typography>
                      )}
                      {details.supplier_name && (
                        <Typography variant="caption" display="block">
                          <strong>Supplier:</strong> {details.supplier_name}
                        </Typography>
                      )}
                      {details.customer_name && (
                        <Typography variant="caption" display="block">
                          <strong>Customer:</strong> {details.customer_name}
                        </Typography>
                      )}
                      {details.invoice_number && (
                        <Typography variant="caption" display="block">
                          <strong>Invoice:</strong> {details.invoice_number}
                        </Typography>
                      )}
                      {details.delivery_notes && (
                        <Typography variant="caption" display="block">
                          <strong>Notes:</strong> {details.delivery_notes}
                        </Typography>
                      )}
                      {details.remarks && (
                        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                          <strong>Remarks:</strong> {details.remarks}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{details.user_name || item.changed_by_name || 'System'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Create Stock Movement">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleInitiateMovement(item)}
                        >
                          <WhatsAppIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" variant="body1" sx={{ mb: 2 }}>
                      {debouncedSearch && action ? (
                        `No ${action === 'Increase' ? 'Stock In' : action === 'Decrease' ? 'Delivery Out' : action === 'Manual Edit' ? 'Correction' : action === 'Undo' ? 'Reversal' : action} transactions found for "${debouncedSearch}".`
                      ) : debouncedSearch ? (
                        `No history found for "${debouncedSearch}".`
                      ) : action ? (
                        `No ${action === 'Increase' ? 'Stock In' : action === 'Decrease' ? 'Delivery Out' : action === 'Manual Edit' ? 'Correction' : action === 'Undo' ? 'Reversal' : action} transactions found.`
                      ) : (
                        'No transaction history found.'
                      )}
                    </Typography>
                    {(debouncedSearch || action) && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSearch('');
                          setAction('');
                          setPage(0);
                        }}
                      >
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

      {/* Reused stock movement dialog */}
      {selectedCombo && (
        <RequestStockDialog
          open={requestDialogOpen}
          onClose={() => setRequestDialogOpen(false)}
          seriesCode={selectedSaree?.series_code || ''}
          sareeId={selectedSareeId}
          beamName={selectedBeam?.beam_name || ''}
          combination={selectedCombo}
          initialMovementType={movementType}
          onSuccess={() => {
            fetchHistory();
            setRequestDialogOpen(false);
          }}
        />
      )}

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default StockHistory;
