/**
 * RequestStockDialog
 * Professional popup for WhatsApp-based supplier stock requests.
 * Shows supplier selection, quantity input, auto-generated message, and opens WhatsApp.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, TextField, Chip, Divider,
  CircularProgress, Alert, Radio, RadioGroup,
  FormControlLabel, Paper, Snackbar, IconButton,
  Avatar, Tooltip, Skeleton
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import { supplierAPI, stockRequestAPI } from '../../services/api';

// ── Build professional WhatsApp message ─────────────────────
const buildWhatsAppMessage = ({ brand, movementType, seriesCode, beamName, colors, currentStock, requestedQty }) => {
  const brandHeader = brand ? `${brand.trim()}\n\n` : '';
  const beamHeader = beamName ? (beamName.trim().endsWith(':') ? beamName.trim() : `${beamName.trim()}:`) : 'Beam:';
  const colorLines = (colors || []).map(c => {
    const fPart = c.f_number || 'F';
    const colorPart = c.color_name || '';
    const companyPart = c.company_name ? ` ( ${c.company_name.trim()} )` : '';
    return `${fPart} : ${colorPart}${companyPart}`;
  }).join('\n');

  const isStockIn = movementType === 'STOCK_IN';
  const statusLabel = isStockIn ? '( IN STOCK )' : '( DELIVERY )';

  return `${brandHeader}${beamHeader}

${seriesCode ? `${seriesCode} ${statusLabel}` : statusLabel}

${colorLines || '(No color details)'}

${requestedQty} pcs/-`;
};

// ── Normalize mobile number for WhatsApp ────────────────────
const normalizeMobile = (mobile) => {
  if (!mobile) return '';
  let num = mobile.replace(/[\s\-()]/g, '');
  if (!num.startsWith('+')) num = '+91' + num.replace(/^0/, '');
  return num.replace(/\+/g, '');
};

const RequestStockDialog = ({ open, onClose, combination, beamName, seriesCode, sareeId, onSuccess, initialMovementType = 'STOCK_IN' }) => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [requestedQty, setRequestedQty] = useState(100);
  const [movementType, setMovementType] = useState(initialMovementType);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [sent, setSent] = useState(false);
  const [showingAllFallback, setShowingAllFallback] = useState(false);

  useEffect(() => {
    if (open) {
      setMovementType(initialMovementType);
    }
  }, [open, initialMovementType]);

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  const message = selectedSupplier ? buildWhatsAppMessage({
    brand: combination?.brand,
    movementType,
    seriesCode,
    beamName,
    colors: combination?.combination_colors,
    currentStock: combination?.current_stock ?? 0,
    requestedQty
  }) : '';

  const fetchSuppliers = useCallback(async () => {
    if (!combination?.id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await supplierAPI.getByCombo(combination.id);
      let list = data.suppliers || [];
      if (list.length === 0) {
        const allRes = await supplierAPI.getAll();
        list = allRes.data.suppliers || [];
        setShowingAllFallback(true);
      } else {
        setShowingAllFallback(false);
      }
      setSuppliers(list);
      if (list.length === 1) setSelectedSupplierId(list[0].id);
      else {
        const primary = list.find(s => s.is_primary);
        if (primary) setSelectedSupplierId(primary.id);
      }
    } catch (e) {
      setError('Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  }, [combination?.id]);

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      setRequestedQty(100);
      setSent(false);
      setSelectedSupplierId('');
      setError('');
    }
  }, [open, fetchSuppliers]);

  const currentStock = combination?.current_stock ?? 0;
  const isDelivery = movementType === 'DELIVERY_OUT';
  const validationError = isDelivery && requestedQty > currentStock ? 'Delivery quantity cannot exceed available stock.' : '';
  const displayError = error || validationError;

  const handleOpenWhatsApp = async () => {
    if (!selectedSupplier) return;
    if (validationError) return;

    setSaving(true);
    setError('');
    try {
      await stockRequestAPI.create({
        saree_id: sareeId,
        combination_id: combination?.id,
        supplier_id: selectedSupplierId,
        beam_name: beamName,
        combination_name: combination?.combination_name,
        series_code: seriesCode,
        requested_qty: requestedQty,
        current_stock: currentStock,
        minimum_stock: combination?.minimum_stock ?? 20,
        whatsapp_message: message,
        movement_type: movementType
      });

      const mobileNum = normalizeMobile(selectedSupplier.mobile);
      const waUrl = `https://wa.me/${mobileNum}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      setSent(true);
      setSnack(isDelivery ? 'Delivery prepared successfully! WhatsApp opened.' : 'Stock request prepared successfully! WhatsApp opened.');
      if (onSuccess) {
        onSuccess();
      }
      if (sareeId) {
        navigate(`/sarees/${sareeId}`);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save request');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setSnack('Message copied to clipboard!');
  };

  const isLowStock = currentStock <= (combination?.minimum_stock ?? 20);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: isDelivery ? 'warning.main' : 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}>
              <WhatsAppIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Stock Movement via WhatsApp</Typography>
              <Typography variant="caption" color="text.secondary">
                {seriesCode} · {beamName} · {combination?.combination_name || 'Combination'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', height: { xs: 'auto', md: 540 }, flexDirection: { xs: 'column', md: 'row' } }}>
            {/* ── Left panel ── */}
            <Box sx={{ width: { xs: '100%', md: 320 }, borderRight: '1px solid', borderColor: 'divider', p: 2.5, overflowY: 'auto' }}>

              {/* Movement Type */}
              <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 0.5 }}>Movement Type</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant={movementType === 'STOCK_IN' ? 'contained' : 'outlined'}
                  color="success"
                  fullWidth
                  size="small"
                  onClick={() => setMovementType('STOCK_IN')}
                  sx={{ py: 0.8, fontWeight: 700 }}
                >
                  Stock In
                </Button>
                <Button
                  variant={movementType === 'DELIVERY_OUT' ? 'contained' : 'outlined'}
                  color="warning"
                  fullWidth
                  size="small"
                  onClick={() => setMovementType('DELIVERY_OUT')}
                  sx={{ py: 0.8, fontWeight: 700 }}
                >
                  Delivery Out
                </Button>
              </Box>

              {/* Stock Info */}
              <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>Stock Info</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, mb: 2 }}>
                <Chip label={`Current: ${currentStock} pcs`}
                  color={isLowStock ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} />
                <Chip label={`Min: ${combination?.minimum_stock ?? 20} pcs`} variant="outlined" size="small" />
                <Chip
                  label={isDelivery ? `Remaining: ${Math.max(0, currentStock - requestedQty)} pcs` : `After Stock: ${currentStock + requestedQty} pcs`}
                  variant="outlined"
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              {/* F-Colors */}
              {combination?.combination_colors?.length > 0 && (
                <>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>F-Colors</Typography>
                  <Box sx={{ mt: 0.5, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {combination.combination_colors.map(c => (
                      <Chip key={c.id} size="small" variant="outlined"
                        label={`${c.f_number}: ${c.color_name}${c.company_name ? ` (${c.company_name})` : ''}`}
                      />
                    ))}
                  </Box>
                </>
              )}

              <Divider sx={{ mb: 2 }} />

              {/* Quantity */}
              <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>
                {isDelivery ? 'Delivery Quantity' : 'Requested Quantity'}
              </Typography>
              <TextField
                type="number" fullWidth size="small" sx={{ mt: 0.5, mb: 2 }}
                value={requestedQty}
                onChange={e => setRequestedQty(Math.max(1, parseInt(e.target.value) || 1))}
                slotProps={{ htmlInput: { min: 1 } }}
                label={isDelivery ? 'Delivery Quantity (pcs)' : 'Stock Quantity (pcs)'}
                error={!!validationError}
                helperText={validationError}
              />

              <Divider sx={{ mb: 2 }} />

              {/* Supplier Selection */}
              <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>Select Supplier</Typography>
              {loading ? (
                <Box sx={{ mt: 1 }}><Skeleton height={60} /><Skeleton height={60} /></Box>
              ) : suppliers.length === 0 ? (
                <Alert severity="warning" sx={{ mt: 1, fontSize: '0.75rem' }}>
                  No active suppliers found in system.<br />
                  Please add suppliers on the Suppliers page first.
                </Alert>
              ) : (
                <>
                  {showingAllFallback && (
                    <Alert severity="info" sx={{ mt: 0.5, mb: 1, fontSize: '0.72rem', py: 0.5, px: 1 }}>
                      No suppliers linked to this combination yet. Showing all active suppliers.
                    </Alert>
                  )}
                  <RadioGroup value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} sx={{ mt: 0.5 }}>
                    {suppliers.map(s => (
                      <Paper key={s.id} variant="outlined" onClick={() => setSelectedSupplierId(s.id)} sx={{
                        mb: 1, p: 1.25, cursor: 'pointer', borderRadius: 2,
                        borderColor: selectedSupplierId === s.id ? 'primary.main' : 'divider',
                        bgcolor: selectedSupplierId === s.id ? 'sidebar.active' : 'transparent',
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: 'primary.light' }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Radio value={s.id} size="small" sx={{ mt: -0.5, p: 0.5 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{s.name}</Typography>
                            {s.company_name && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                <BusinessIcon sx={{ fontSize: 11 }} />{s.company_name}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: 'success.main', fontWeight: 600 }}>
                              <PhoneIcon sx={{ fontSize: 11 }} />{s.mobile}
                            </Typography>
                          </Box>
                          {s.is_primary && <Chip label="Primary" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem' }} />}
                        </Box>
                      </Paper>
                    ))}
                  </RadioGroup>
                </>
              )}
            </Box>

            {/* ── Right panel: Message Preview ── */}
            <Box sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>Message Preview</Typography>
                {message && (
                  <Tooltip title="Copy message">
                    <IconButton size="small" onClick={handleCopy}><ContentCopyIcon fontSize="small" /></IconButton>
                  </Tooltip>
                )}
              </Box>

              {!selectedSupplier ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1.5, color: 'text.secondary' }}>
                  <PersonIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                  <Typography variant="body2">Select a supplier to preview the WhatsApp message</Typography>
                </Box>
              ) : (
                <Paper variant="outlined" sx={{
                  flex: 1, p: 2, borderRadius: 2, bgcolor: '#f0fdf4',
                  fontFamily: '"Courier New", Courier, monospace', fontSize: '0.82rem',
                  lineHeight: 1.8, whiteSpace: 'pre-wrap', overflowY: 'auto',
                  borderColor: '#86efac', color: '#15803d'
                }}>
                  {message}
                </Paper>
              )}

              {sent && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Request saved. WhatsApp opened — just press Send!
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>

        {displayError && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{displayError}</Alert>}

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" size="large">Cancel</Button>
          {sent && selectedSupplier && (
            <Button
              variant="outlined" color="success" size="large"
              startIcon={<WhatsAppIcon />}
              onClick={() => {
                const mobileNum = normalizeMobile(selectedSupplier.mobile);
                window.open(`https://wa.me/${mobileNum}?text=${encodeURIComponent(message)}`, '_blank');
              }}
            >
              Open Again
            </Button>
          )}
          <Button
            variant="contained" color="success" size="large"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            disabled={!selectedSupplier || saving || suppliers.length === 0 || !!validationError}
            onClick={handleOpenWhatsApp}
            sx={{ minWidth: 220 }}
          >
            {saving ? 'Saving...' : (isDelivery ? 'Send Delivery Message on WhatsApp' : 'Send Stock Request on WhatsApp')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default RequestStockDialog;
