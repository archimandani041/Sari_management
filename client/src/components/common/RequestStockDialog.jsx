/**
 * RequestStockDialog - Stock Movement & Action Dialog
 * Supports 3 Actions:
 *  1. Stock (Green Badge 🟢 ➕): New stock received from supplier (+Qty)
 *  2. Delivery (Blue Badge 🔵 🏭): Machine delivery for production (0 stock change)
 *  3. Stock Delivery (Orange Badge 🟠 📦): Delivered from existing inventory (-Qty with stock validation)
 */
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, TextField, Chip, Divider,
  CircularProgress, Alert, Paper, Snackbar, IconButton, Tooltip,
  Stack, Grid
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { stockAPI, stockRequestAPI } from '../../services/api';

// Build WhatsApp message tailored to action type
const buildWhatsAppMessage = ({ action, seriesCode, beamName, comboName, colors, requestedQty, supplierName, customerName, machineName, invoiceNum, remarks }) => {
  const lines = [];
  const beamHeader = beamName ? (beamName.endsWith(':') ? beamName : `${beamName}:`) : 'Beam:';
  
  if (action === 'Stock') {
    lines.push(`🟢 [ STOCK ADDED ]`);
    lines.push(`${seriesCode || 'Sari'} · ${beamHeader}`);
    lines.push(`Combination: ${comboName || 'Standard'}`);
    (colors || []).forEach(c => lines.push(`${c.f_number || 'F'}: ${c.color_name || ''}`));
    lines.push(`Added Quantity: +${requestedQty} pcs`);
    if (supplierName) lines.push(`Supplier: ${supplierName}`);
    if (remarks) lines.push(`Remarks: ${remarks}`);
  } else if (action === 'Delivery') {
    lines.push(`🏭 [ MACHINE DELIVERY ]`);
    lines.push(`${seriesCode || 'Sari'} · ${beamHeader}`);
    lines.push(`Combination: ${comboName || 'Standard'}`);
    (colors || []).forEach(c => lines.push(`${c.f_number || 'F'}: ${c.color_name || ''}`));
    lines.push(`Machine Delivery Quantity: ${requestedQty} pcs (Production Only)`);
    if (machineName) lines.push(`Machine: ${machineName}`);
    if (remarks) lines.push(`Remarks: ${remarks}`);
  } else {
    lines.push(`📦 [ STOCK DELIVERED ]`);
    lines.push(`${seriesCode || 'Sari'} · ${beamHeader}`);
    lines.push(`Combination: ${comboName || 'Standard'}`);
    (colors || []).forEach(c => lines.push(`${c.f_number || 'F'}: ${c.color_name || ''}`));
    lines.push(`Dispatched Quantity: -${requestedQty} pcs`);
    if (customerName) lines.push(`Customer: ${customerName}`);
    if (invoiceNum) lines.push(`Invoice #: ${invoiceNum}`);
    if (remarks) lines.push(`Remarks: ${remarks}`);
  }
  
  return lines.join('\n');
};

const RequestStockDialog = ({
  open, onClose, combination, beamName, seriesCode, sareeId, onSuccess,
  initialAction = 'Stock'
}) => {
  const [action, setAction] = useState(initialAction); // 'Stock', 'Delivery', 'Stock Delivery'
  const [requestedQty, setRequestedQty] = useState(10);
  const [supplierName, setSupplierName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [machineName, setMachineName] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAction(initialAction);
      setRequestedQty(10);
      setSupplierName('');
      setCustomerName('');
      setMachineName('');
      setOperatorName('');
      setInvoiceNumber('');
      setRemarks('');
      setSent(false);
      setError('');
    }
  }, [open, initialAction]);

  const currentStock = combination?.current_stock ?? 0;

  // Compute preview stock based on action
  let previewStock = currentStock;
  if (action === 'Stock') previewStock = currentStock + requestedQty;
  else if (action === 'Stock Delivery') previewStock = Math.max(0, currentStock - requestedQty);
  else previewStock = currentStock; // Delivery does NOT change inventory

  // Validation
  let validationError = '';
  if (action === 'Stock Delivery' && requestedQty > currentStock) {
    validationError = `Only ${currentStock} pieces are available in stock.`;
  }
  if (!requestedQty || requestedQty <= 0) {
    validationError = 'Please enter a valid quantity greater than zero.';
  }

  const message = buildWhatsAppMessage({
    action,
    seriesCode,
    beamName,
    comboName: combination?.combination_name,
    colors: combination?.combination_colors,
    requestedQty,
    supplierName,
    customerName,
    machineName,
    invoiceNum: invoiceNumber,
    remarks
  });

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSubmit = async () => {
    if (validationError) return;
    setSaving(true);
    setError('');

    try {
      if (combination?.id) {
        await stockAPI.update({
          saree_id: sareeId,
          combination_id: combination.id,
          action,
          quantity: requestedQty,
          supplier_name: supplierName,
          customer_name: customerName,
          machine: machineName,
          operator_name: operatorName,
          invoice_number: invoiceNumber,
          remarks: remarks || (action === 'Stock' ? 'Purchase / Received' : action === 'Delivery' ? 'Machine Delivery' : 'Stock Delivered')
        });
      }

      openWhatsApp();
      setSent(true);
      setSnack(`✓ ${action} action recorded successfully. WhatsApp opened!`);
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to record stock action.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setSnack('Message copied to clipboard!');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        {/* Title Bar */}
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 42, height: 42, borderRadius: '50%',
              bgcolor: action === 'Stock' ? '#DCFCE7' : action === 'Delivery' ? '#E0F2FE' : '#FFEDD5',
              color: action === 'Stock' ? '#15803D' : action === 'Delivery' ? '#0284C7' : '#EA580C',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {action === 'Stock' && <AddCircleIcon sx={{ fontSize: 24 }} />}
              {action === 'Delivery' && <PrecisionManufacturingIcon sx={{ fontSize: 24 }} />}
              {action === 'Stock Delivery' && <LocalShippingIcon sx={{ fontSize: 24 }} />}
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Stock Management Action
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {seriesCode} · {beamName} · {combination?.combination_name || 'Combination'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', height: { xs: 'auto', md: 500 }, flexDirection: { xs: 'column', md: 'row' } }}>

            {/* Left Configuration Form */}
            <Box sx={{ width: { xs: '100%', md: 360 }, borderRight: '1px solid', borderColor: 'divider', p: 2.5, overflowY: 'auto' }}>
              
              {/* 1. Action Selector */}
              <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.68rem', display: 'block', mb: 1 }}>
                SELECT ACTION
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
                {/* Action 1: Stock */}
                <Button
                  variant={action === 'Stock' ? 'contained' : 'outlined'}
                  onClick={() => setAction('Stock')}
                  fullWidth size="small"
                  startIcon={<AddCircleIcon />}
                  sx={{
                    py: 1, fontWeight: 700, fontSize: '0.75rem',
                    bgcolor: action === 'Stock' ? '#15803D' : 'transparent',
                    color: action === 'Stock' ? '#fff' : '#15803D',
                    borderColor: '#15803D',
                    '&:hover': { bgcolor: action === 'Stock' ? '#166534' : '#DCFCE7' }
                  }}
                >
                  Stock
                </Button>

                {/* Action 2: Delivery */}
                <Button
                  variant={action === 'Delivery' ? 'contained' : 'outlined'}
                  onClick={() => setAction('Delivery')}
                  fullWidth size="small"
                  startIcon={<PrecisionManufacturingIcon />}
                  sx={{
                    py: 1, fontWeight: 700, fontSize: '0.75rem',
                    bgcolor: action === 'Delivery' ? '#0284C7' : 'transparent',
                    color: action === 'Delivery' ? '#fff' : '#0284C7',
                    borderColor: '#0284C7',
                    '&:hover': { bgcolor: action === 'Delivery' ? '#0369A1' : '#E0F2FE' }
                  }}
                >
                  Delivery
                </Button>

                {/* Action 3: Stock Delivery */}
                <Button
                  variant={action === 'Stock Delivery' ? 'contained' : 'outlined'}
                  onClick={() => setAction('Stock Delivery')}
                  fullWidth size="small"
                  startIcon={<LocalShippingIcon />}
                  sx={{
                    py: 1, fontWeight: 700, fontSize: '0.75rem',
                    bgcolor: action === 'Stock Delivery' ? '#EA580C' : 'transparent',
                    color: action === 'Stock Delivery' ? '#fff' : '#EA580C',
                    borderColor: '#EA580C',
                    '&:hover': { bgcolor: action === 'Stock Delivery' ? '#C2410C' : '#FFEDD5' }
                  }}
                >
                  Stock Delivery
                </Button>
              </Stack>

              {/* Action Description Banner */}
              <Paper elevation={0} sx={{
                p: 1.5, mb: 2, borderRadius: 2, border: '1px solid',
                borderColor: action === 'Stock' ? '#86EFAC' : action === 'Delivery' ? '#7DD3FC' : '#FDBA74',
                bgcolor: action === 'Stock' ? '#F0FDF4' : action === 'Delivery' ? '#F0F9FF' : '#FFF7ED'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: action === 'Stock' ? '#15803D' : action === 'Delivery' ? '#0284C7' : '#EA580C' }}>
                  {action === 'Stock' && '🟢 Stock: Add new stock received from supplier.'}
                  {action === 'Delivery' && '🔵 Delivery: Send to machine for production. Inventory will NOT change.'}
                  {action === 'Stock Delivery' && '🟠 Stock Delivery: Deliver directly from existing stock. Deducts inventory.'}
                </Typography>
              </Paper>

              {/* Current Stock Preview */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={`Current Stock: ${currentStock} pcs`} variant="outlined" size="small" sx={{ fontWeight: 700 }} />
                <Chip
                  label={
                    action === 'Stock' ? `New Stock: ${previewStock} pcs (+${requestedQty})` :
                    action === 'Stock Delivery' ? `New Stock: ${previewStock} pcs (-${requestedQty})` :
                    `Current Stock Unchanged (${currentStock} pcs)`
                  }
                  size="small"
                  sx={{
                    fontWeight: 800,
                    bgcolor: action === 'Stock' ? '#DCFCE7' : action === 'Delivery' ? '#E0F2FE' : '#FFEDD5',
                    color: action === 'Stock' ? '#15803D' : action === 'Delivery' ? '#0284C7' : '#EA580C'
                  }}
                />
              </Box>

              {/* Quantity Input */}
              <TextField
                type="number" fullWidth size="small" sx={{ mb: 2 }}
                label="Quantity (pcs)"
                value={requestedQty}
                onChange={e => setRequestedQty(Math.max(1, parseInt(e.target.value) || 0))}
                slotProps={{ htmlInput: { min: 1 } }}
                error={!!validationError}
                helperText={validationError}
              />

              {/* Conditional Inputs based on Action */}
              {action === 'Stock' && (
                <TextField
                  fullWidth size="small" sx={{ mb: 2 }}
                  label="Supplier Name (Optional)"
                  placeholder="e.g. Surat Weaving Mills"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                />
              )}

              {action === 'Delivery' && (
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid size={6}>
                    <TextField
                      fullWidth size="small"
                      label="Machine Name / #"
                      placeholder="e.g. Machine 4"
                      value={machineName}
                      onChange={e => setMachineName(e.target.value)}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      fullWidth size="small"
                      label="Operator"
                      placeholder="e.g. Ramesh"
                      value={operatorName}
                      onChange={e => setOperatorName(e.target.value)}
                    />
                  </Grid>
                </Grid>
              )}

              {action === 'Stock Delivery' && (
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid size={6}>
                    <TextField
                      fullWidth size="small"
                      label="Customer Name"
                      placeholder="e.g. Apex Traders"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      fullWidth size="small"
                      label="Invoice #"
                      placeholder="e.g. INV-9902"
                      value={invoiceNumber}
                      onChange={e => setInvoiceNumber(e.target.value)}
                    />
                  </Grid>
                </Grid>
              )}

              <TextField
                fullWidth size="small" sx={{ mb: 1 }}
                label="Remarks / Reason"
                placeholder="Add optional notes..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </Box>

            {/* Right Message & Confirmation Preview */}
            <Box sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column', overflowY: 'auto', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.68rem' }}>
                  WHATSAPP MESSAGE PREVIEW
                </Typography>
                <Tooltip title="Copy text">
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

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              {sent && !error && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Action recorded! WhatsApp window opened.
                </Alert>
              )}
            </Box>

          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
          <Button
            variant="contained" size="large"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <WhatsAppIcon />}
            disabled={saving || !!validationError}
            onClick={handleSubmit}
            sx={{
              minWidth: 220,
              bgcolor: action === 'Stock' ? '#15803D' : action === 'Delivery' ? '#0284C7' : '#EA580C',
              '&:hover': {
                bgcolor: action === 'Stock' ? '#166534' : action === 'Delivery' ? '#0369A1' : '#C2410C'
              }
            }}
          >
            {saving ? 'Processing...' : `Record ${action} & Send`}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')}
        message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default RequestStockDialog;
