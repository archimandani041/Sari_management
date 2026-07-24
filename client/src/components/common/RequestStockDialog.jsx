/**
 * RequestStockDialog
 * Direct WhatsApp trigger — opens WhatsApp with pre-filled message
 * AND immediately updates the combination stock in the database.
 */
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, TextField, Chip, Divider,
  CircularProgress, Alert, Paper, Snackbar, IconButton, Tooltip
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { stockRequestAPI, combinationAPI } from '../../services/api';

// ── Build compact WhatsApp message (no blank lines) ──────────
const buildWhatsAppMessage = ({ brand, movementType, seriesCode, beamName, colors, requestedQty }) => {
  const lines = [];
  if (brand) lines.push(brand.trim());
  const beamHeader = beamName
    ? (beamName.trim().endsWith(':') ? beamName.trim() : `${beamName.trim()}:`)
    : 'Beam:';
  lines.push(beamHeader);
  const isStockIn = movementType === 'STOCK_IN';
  const statusLabel = isStockIn ? '( IN STOCK )' : '( DELIVERY )';
  if (seriesCode) lines.push(`${seriesCode} ${statusLabel}`);
  else lines.push(statusLabel);
  (colors || []).forEach(c => {
    const fPart = c.f_number || 'F';
    const colorPart = c.color_name || '';
    const companyPart = c.company_name ? ` ( ${c.company_name.trim()} )` : '';
    lines.push(`${fPart} : ${colorPart}${companyPart}`);
  });
  lines.push(`${requestedQty} pcs/-`);
  return lines.join('\n');
};

const RequestStockDialog = ({
  open, onClose, combination, beamName, seriesCode, sareeId, onSuccess,
  initialMovementType = 'STOCK_IN'
}) => {
  const [movementType, setMovementType] = useState(initialMovementType);
  const [requestedQty, setRequestedQty] = useState(100);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMovementType(initialMovementType);
      setRequestedQty(100);
      setSent(false);
      setError('');
    }
  }, [open, initialMovementType]);

  const currentStock = combination?.current_stock ?? 0;
  const isDelivery = movementType === 'DELIVERY_OUT';
  const isLowStock = currentStock <= (combination?.minimum_stock ?? 20);
  const newStock = isDelivery
    ? Math.max(0, currentStock - requestedQty)
    : currentStock + requestedQty;

  const validationError = isDelivery && requestedQty > currentStock
    ? 'Delivery quantity cannot exceed available stock.'
    : '';

  const message = buildWhatsAppMessage({
    brand: combination?.brand,
    movementType,
    seriesCode,
    beamName,
    colors: combination?.combination_colors,
    requestedQty,
  });

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSend = async () => {
    if (validationError) return;
    setSaving(true);
    setError('');
    try {
      // 1. Update actual stock in database
      if (combination?.id) {
        await combinationAPI.update(combination.id, {
          current_stock: newStock,
          action: isDelivery ? 'Decrease' : 'Increase',
          reason: isDelivery
            ? `Delivery Out via WhatsApp (${requestedQty} pcs)`
            : `Stock In via WhatsApp (${requestedQty} pcs)`,
        });
      }

      // 2. Log stock request (optional record-keeping, fail silently)
      try {
        await stockRequestAPI.create({
          saree_id: sareeId,
          combination_id: combination?.id,
          supplier_id: null,
          beam_name: beamName,
          combination_name: combination?.combination_name,
          series_code: seriesCode,
          requested_qty: requestedQty,
          current_stock: currentStock,
          minimum_stock: combination?.minimum_stock ?? 20,
          whatsapp_message: message,
          movement_type: movementType,
        });
      } catch (_) { /* non-critical */ }

      // 3. Open WhatsApp
      openWhatsApp();
      setSent(true);
      setSnack(isDelivery
        ? `✓ Delivery Out: ${requestedQty} pcs recorded. WhatsApp opened!`
        : `✓ Stock In: +${requestedQty} pcs recorded. WhatsApp opened!`
      );
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to update stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setSnack('Message copied!');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '50%',
              bgcolor: '#25D366',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}>
              <WhatsAppIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Stock Movement via WhatsApp
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {seriesCode} · {beamName} · {combination?.combination_name || 'Combination'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', height: { xs: 'auto', md: 480 }, flexDirection: { xs: 'column', md: 'row' } }}>

            {/* ── Left panel ── */}
            <Box sx={{ width: { xs: '100%', md: 280 }, borderRight: '1px solid', borderColor: 'divider', p: 2.5, overflowY: 'auto' }}>

              {/* Movement Type */}
              <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 0.5 }}>
                Movement Type
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant={movementType === 'STOCK_IN' ? 'contained' : 'outlined'}
                  color="success" fullWidth size="small"
                  onClick={() => setMovementType('STOCK_IN')}
                  sx={{ py: 0.8, fontWeight: 700 }}
                >
                  Stock In
                </Button>
                <Button
                  variant={movementType === 'DELIVERY_OUT' ? 'contained' : 'outlined'}
                  color="warning" fullWidth size="small"
                  onClick={() => setMovementType('DELIVERY_OUT')}
                  sx={{ py: 0.8, fontWeight: 700 }}
                >
                  Delivery Out
                </Button>
              </Box>

              {/* Stock Info */}
              <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>Stock Info</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={`Current: ${currentStock} pcs`} color={isLowStock ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} />
                <Chip label={`Min: ${combination?.minimum_stock ?? 20} pcs`} variant="outlined" size="small" />
                <Chip
                  label={isDelivery ? `After: ${newStock} pcs` : `After: +${requestedQty} → ${newStock} pcs`}
                  variant="outlined" color={isDelivery ? 'warning' : 'success'} size="small" sx={{ fontWeight: 700 }}
                />
              </Box>

              {/* F-Colors summary */}
              {combination?.combination_colors?.length > 0 && (
                <>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>F-Colors</Typography>
                  <Box sx={{ mt: 0.5, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
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
                type="number" fullWidth size="small" sx={{ mt: 0.5, mb: 1 }}
                value={requestedQty}
                onChange={e => setRequestedQty(Math.max(1, parseInt(e.target.value) || 1))}
                slotProps={{ htmlInput: { min: 1 } }}
                label={isDelivery ? 'Delivery Quantity (pcs)' : 'Stock Quantity (pcs)'}
                error={!!validationError}
                helperText={validationError}
              />

              <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.75rem' }} icon={<WhatsAppIcon fontSize="small" />}>
                Stock will update immediately. WhatsApp will open to notify your contact.
              </Alert>
            </Box>

            {/* ── Right panel: Message Preview ── */}
            <Box sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>
                  Message Preview
                </Typography>
                <Tooltip title="Copy message">
                  <IconButton size="small" onClick={handleCopy}><ContentCopyIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>

              <Paper variant="outlined" sx={{
                flex: 1, p: 2, borderRadius: 2, bgcolor: '#f0fdf4',
                fontFamily: '"Courier New", Courier, monospace', fontSize: '0.88rem',
                lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowY: 'auto',
                borderColor: '#86efac', color: '#15803d'
              }}>
                {message}
              </Paper>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
              )}
              {sent && !error && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Stock updated! WhatsApp opened — select a contact and press Send.
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>

        {validationError && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{validationError}</Alert>}

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" size="large">Cancel</Button>
          {sent && (
            <Button
              variant="outlined" color="success" size="large"
              startIcon={<WhatsAppIcon />}
              onClick={openWhatsApp}
            >
              Open Again
            </Button>
          )}
          <Button
            variant="contained" size="large"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <WhatsAppIcon />}
            disabled={saving || !!validationError}
            onClick={handleSend}
            sx={{
              minWidth: 240,
              bgcolor: '#25D366',
              '&:hover': { bgcolor: '#1ebe57' },
              '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
            }}
          >
            {saving
              ? (isDelivery ? 'Updating delivery...' : 'Updating stock...')
              : (isDelivery ? 'Open WhatsApp — Delivery Out' : 'Open WhatsApp — Stock In')
            }
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default RequestStockDialog;
