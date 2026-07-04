/**
 * Stock History Audit Trail Page
 * Complete log of all stock adjustments, changes, and user attributions with JSON metadata.
 */
import { useState, useEffect, useCallback } from 'react';
import { stockAPI } from '../services/api';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Typography, FormControl, InputLabel, Select,
  MenuItem, Grid, TextField, Chip, CircularProgress, Tooltip, IconButton
} from '@mui/material';
import {
  Info as InfoIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

const StockHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        action: action || undefined,
        search: search || undefined
      };
      const { data } = await stockAPI.getHistory(params);
      setHistory(data.history || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, action, search]);

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

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
          Stock Transaction History
        </Typography>
        <Typography variant="subtitle1">
          Complete immutable audit trails of all inventory adjustments
        </Typography>
      </Box>

      {/* Filter Options */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Filter by Action</InputLabel>
              <Select value={action} label="Filter by Action" onChange={(e) => { setAction(e.target.value); setPage(0); }}>
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="Increase">Increase (+)</MenuItem>
                <MenuItem value="Decrease">Decrease (-)</MenuItem>
                <MenuItem value="Manual Edit">Manual Edit</MenuItem>
                <MenuItem value="Undo">Undo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              label="Search keyword"
              placeholder="Sari, Beam, Combo, User, Remarks..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Transactions Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Saree Info</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Beam / Combination</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Adjustment</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action Details</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ERP Metadata & Notes</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Responsible User</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => {
                const details = item.details || {};
                return (
                  <TableRow key={item.id} hover sx={{ opacity: item.is_undone ? 0.5 : 1 }}>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{new Date(item.created_at).toLocaleString()}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {item.sarees?.sari_name || '—'}
                      <Typography variant="caption" display="block" color="text.secondary">
                        Code: {item.sarees?.series_code || item.series_code}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>
                      {details.beam_name || item.beam_name || '—'}
                      <Typography variant="caption" display="block" color="text.secondary">
                        Combo: {details.combination_name || item.combination_name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {item.old_stock} → {item.new_stock}
                      <Typography variant="caption" display="block" color="text.secondary">
                        Change: {details.quantity_changed >= 0 ? `+${details.quantity_changed}` : details.quantity_changed}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={details.action || item.action}
                        size="small"
                        color={
                          item.action === 'Increase' ? 'success' :
                          item.action === 'Decrease' ? 'error' :
                          item.action === 'Undo' ? 'warning' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', maxWidth: 300 }}>
                      {details.reason_category && (
                        <Typography variant="caption" display="block">
                          <strong>Category:</strong> {details.reason_category}
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
                  </TableRow>
                );
              })}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No stock transaction history found.
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
    </Box>
  );
};

export default StockHistory;
