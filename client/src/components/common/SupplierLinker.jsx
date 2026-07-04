/**
 * SupplierLinker
 * Embeddable component to link/unlink suppliers to a specific combination.
 * Used inside SareeEdit page's combination cards.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItemButton, ListItemText, ListItemSecondaryAction,
  IconButton, Checkbox, Avatar, Alert, CircularProgress
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PersonIcon from '@mui/icons-material/Person';
import { supplierAPI } from '../../services/api';

const SupplierLinker = ({ combinationId, combinationName }) => {
  const [open, setOpen] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [linkedIds, setLinkedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!combinationId) return;
    setLoading(true);
    try {
      const [allRes, linkedRes] = await Promise.all([
        supplierAPI.getAll(),
        supplierAPI.getByCombo(combinationId)
      ]);
      setAllSuppliers(allRes.data.suppliers || []);
      setLinkedIds((linkedRes.data.suppliers || []).map(s => s.id));
    } catch (e) {
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [combinationId]);

  useEffect(() => { if (open) fetchData(); }, [open, fetchData]);

  const toggleSupplier = async (supplierId, currentlyLinked) => {
    setSaving(true);
    try {
      if (currentlyLinked) {
        await supplierAPI.unlinkFromCombo(combinationId, supplierId);
        setLinkedIds(ids => ids.filter(id => id !== supplierId));
      } else {
        await supplierAPI.linkToCombo(combinationId, { supplier_id: supplierId });
        setLinkedIds(ids => [...ids, supplierId]);
      }
    } catch (e) {
      setError('Failed to update supplier link');
    } finally {
      setSaving(false);
    }
  };

  const linkedSuppliers = allSuppliers.filter(s => linkedIds.includes(s.id));

  return (
    <>
      <Box sx={{ mt: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {linkedSuppliers.length > 0 ? (
            linkedSuppliers.map(s => (
              <Chip
                key={s.id}
                icon={<PersonIcon />}
                label={s.name}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))
          ) : (
            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
              No suppliers linked
            </Typography>
          )}
          <Button
            size="small" startIcon={<LinkIcon fontSize="small" />}
            onClick={() => setOpen(true)}
            sx={{ ml: 'auto', fontSize: '0.7rem' }}
          >
            Manage Suppliers
          </Button>
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          Link Suppliers to "{combinationName}"
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={32} /></Box>
          ) : allSuppliers.length === 0 ? (
            <Alert severity="info">No suppliers exist yet. Add suppliers from the Suppliers page first.</Alert>
          ) : (
            <List dense>
              {allSuppliers.map(s => {
                const linked = linkedIds.includes(s.id);
                return (
                  <ListItemButton key={s.id} onClick={() => toggleSupplier(s.id, linked)} disabled={saving}
                    sx={{ borderRadius: 2, mb: 0.5, border: '1px solid', borderColor: linked ? 'primary.light' : 'divider', bgcolor: linked ? 'action.selected' : 'transparent' }}>
                    <Checkbox checked={linked} size="small" sx={{ mr: 1 }} />
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>{s.name}</Typography>}
                      secondary={<span>{s.company_name || ''} · {s.mobile}</span>}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} variant="contained">Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SupplierLinker;
