/**
 * All Sarees Management Page
 * Main CRUD grid, sorting, filtering, quick action buttons, pagination, bulk action
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sareeAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Typography, TextField, Button, MenuItem,
  Select, InputLabel, FormControl, Grid, IconButton, Chip, Avatar,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Skeleton, Card, CardContent, InputAdornment, CardActions
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  Add as AddIcon,
  Search,
  Clear as ClearIcon,
  FileDownload
} from '@mui/icons-material';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';

const AllSarees = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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

  const debouncedSearch = useDebounce(search, 300);
  const debouncedCompany = useDebounce(company, 300);
  const debouncedColor = useDebounce(color, 300);

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

  const getStockStatus = (totalStock, minStock) => {
    if (totalStock === 0) return { label: 'OUT OF STOCK', color: 'error', bg: 'rgba(239, 68, 68, 0.08)' };
    if (totalStock <= minStock) return { label: 'LOW STOCK', color: 'warning', bg: 'rgba(245, 158, 11, 0.08)' };
    return { label: 'HEALTHY', color: 'success', bg: 'rgba(16, 185, 129, 0.08)' };
  };

  return (
    <Box>
      {/* Title Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
            Sarees Inventory
          </Typography>
          <Typography variant="subtitle1">
            Browse, manage, and audit saree stocks
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExportExcel}>
            Export to Excel
          </Button>
          {isAdmin && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/sarees/add')}>
              Add New Saree
            </Button>
          )}
        </Box>
      </Box>

      {/* Filter / Search Bar */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2}>
          {/* Row 1 */}
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              fullWidth
              label="Search Saree"
              placeholder="Name or Series Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearch('')} size="small"><ClearIcon /></IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3.5 }}>
            <FormControl fullWidth>
              <InputLabel>Stock Status</InputLabel>
              <Select value={status} label="Stock Status" onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="healthy">Healthy</MenuItem>
                <MenuItem value="low">Low Stock</MenuItem>
                <MenuItem value="out">Out of Stock</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3.5 }}>
            <FormControl fullWidth>
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

          {/* Row 2 */}
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Saree Status</InputLabel>
              <Select value={sareeStatusFilter} label="Saree Status" onChange={(e) => setSareeStatusFilter(e.target.value)}>
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="In Stock">In Stock</MenuItem>
                <MenuItem value="In Delivery">In Delivery</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Brand</InputLabel>
              <Select value={brandFilter} label="Brand" onChange={(e) => setBrandFilter(e.target.value)}>
                <MenuItem value="">All Brands</MenuItem>
                <MenuItem value="KP">KP</MenuItem>
                <MenuItem value="KPR">KPR</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              fullWidth
              label="Company Filter"
              placeholder="e.g. Ramdev..."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              fullWidth
              label="Color Filter"
              placeholder="e.g. Purple..."
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Grid or Table layout */}
      {loading ? (
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} height={60} sx={{ my: 1 }} />
          ))}
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Image</TableCell>
                <TableCell>Sari Name</TableCell>
                <TableCell>Series Code</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Current Stock</TableCell>
                <TableCell align="right">Min Stock</TableCell>
                <TableCell align="right">Max Stock</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sarees.map((saree) => {
                const statusInfo = getStockStatus(saree.total_stock, saree.min_stock);
                return (
                  <TableRow
                    key={saree.id}
                    hover
                    onClick={() => navigate(`/sarees/${saree.id}`)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <TableCell>
                      <Avatar
                        src={saree.image_url}
                        variant="rounded"
                        sx={{ width: 48, height: 48, bgcolor: 'primary.light' }}
                      >
                        🧵
                      </Avatar>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{saree.sari_name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                        <Chip label={saree.series_code} color="primary" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap', maxWidth: 180 }}>
                          {Array.from(new Set(saree.beams?.flatMap(b => b.combinations?.map(c => c.brand).filter(Boolean)) || [])).map(b => (
                            <Chip
                              key={b}
                              label={b}
                              size="small"
                              sx={{
                                fontSize: '0.65rem',
                                height: 18,
                                fontWeight: 800,
                                bgcolor: b === 'KP' ? 'secondary.light' : 'warning.light',
                                color: b === 'KP' ? 'secondary.dark' : 'warning.dark'
                              }}
                            />
                          ))}
                          {Array.from(new Set(saree.beams?.flatMap(b => b.combinations?.map(c => c.status).filter(Boolean)) || [])).map(s => (
                            <Chip
                              key={s}
                              label={s}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: '0.65rem',
                                height: 18,
                                fontWeight: 800,
                                color: s === 'In Stock' ? 'success.main' : 'info.main',
                                borderColor: s === 'In Stock' ? 'success.main' : 'info.main'
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>{saree.price != null ? `₹${Number(saree.price).toLocaleString('en-IN')}` : '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>{saree.total_stock ?? 0} pcs</TableCell>
                    <TableCell align="right" color="text.secondary">{saree.min_stock ?? 20}</TableCell>
                    <TableCell align="right">{saree.maximum_stock}</TableCell>
                    <TableCell>
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                        sx={{ bgcolor: statusInfo.bg, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                      {isAdmin && (
                        <>
                          <IconButton onClick={() => navigate(`/sarees/edit/${saree.id}`)} color="info" size="small">
                            <Edit />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteClick(saree)} color="error" size="small">
                            <Delete />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {sarees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No sarees found matching criteria.
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
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
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
      <Dialog open={snackbarOpen} onClose={() => setSnackbarOpen(false)} PaperProps={{ sx: { p: 1, borderRadius: 2 } }}>
        <DialogContent sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{snackbarMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnackbarOpen(false)} variant="contained" size="small">OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllSarees;
