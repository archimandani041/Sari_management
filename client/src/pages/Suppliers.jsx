/**
 * Suppliers Page
 * Full CRUD for suppliers and combination-supplier linking
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Chip, Alert, Snackbar,
  Avatar, Tooltip, Skeleton, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SearchIcon from '@mui/icons-material/Search';
import { supplierAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const EMPTY_FORM = { name: '', company_name: '', mobile: '', email: '', address: '', notes: '' };

const Suppliers = () => {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supplierAPI.getAll();
      setSuppliers(data.suppliers || []);
    } catch (e) {
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setError(''); setDialogOpen(true); };
  const openEdit = (s) => { setEditId(s.id); setForm({ name: s.name, company_name: s.company_name || '', mobile: s.mobile, email: s.email || '', address: s.address || '', notes: s.notes || '' }); setError(''); setDialogOpen(true); };
  const openDelete = (id) => { setDeleteId(id); setDeleteOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Supplier name is required'); return; }
    if (!form.mobile.trim()) { setError('Mobile number is required'); return; }
    setSaving(true); setError('');
    try {
      if (editId) {
        await supplierAPI.update(editId, form);
        setSnack('Supplier updated successfully');
      } else {
        await supplierAPI.create(form);
        setSnack('Supplier created successfully');
      }
      setDialogOpen(false);
      fetchSuppliers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await supplierAPI.delete(deleteId);
      setDeleteOpen(false);
      setSnack('Supplier removed');
      fetchSuppliers();
    } catch (e) {
      setError('Failed to delete supplier');
    }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    s.mobile.includes(search)
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>Suppliers</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your fabric suppliers and link them to sari combinations
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} size="large">
            Add Supplier
          </Button>
        )}
      </Box>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <TextField
          fullWidth size="small" placeholder="Search by name, company, or mobile..."
          value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
        />
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mobile</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                {isAdmin && <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6].map(j => <TableCell key={j}><Skeleton /></TableCell>)}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">
                      {search ? 'No suppliers match your search.' : 'No suppliers yet. Add your first supplier.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.85rem' }}>
                        {s.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography sx={{ fontWeight: 700 }}>{s.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {s.company_name ? (
                      <Chip icon={<BusinessIcon />} label={s.company_name} size="small" variant="outlined" />
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Tooltip title="Open WhatsApp">
                        <IconButton size="small" color="success"
                          onClick={() => window.open(`https://wa.me/${s.mobile.replace(/\D/g, '')}`, '_blank')}>
                          <WhatsAppIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.mobile}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{s.email || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.notes || '—'}
                    </Typography>
                  </TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" color="info" onClick={() => openEdit(s)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => openDelete(s.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editId ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Supplier Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonIcon color="action" fontSize="small" /></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Company Name" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><BusinessIcon color="action" fontSize="small" /></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Mobile Number *" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                placeholder="+91XXXXXXXXXX"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><PhoneIcon color="action" fontSize="small" /></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Email (Optional)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailIcon color="action" fontSize="small" /></InputAdornment> } }} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Address (Optional)" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><LocationOnIcon color="action" fontSize="small" /></InputAdornment> } }} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth multiline rows={2} label="Notes (Optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editId ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Remove Supplier?</DialogTitle>
        <DialogContent>This will deactivate the supplier and remove them from all combination links.</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Remove</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
};

export default Suppliers;
