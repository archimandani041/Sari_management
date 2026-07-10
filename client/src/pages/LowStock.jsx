/**
 * Low Stock — Action Page (spec §12)
 * Every item is directly actionable: shows shortage, AI recommendation, and Request Stock button.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sareeAPI } from '../services/api';
import { supabase } from '../services/supabase';
import { getStockHealth } from '../constants/terms';
import RequestStockDialog from '../components/common/RequestStockDialog';
import {
  Box, Paper, Typography, Chip, Button, Alert, CircularProgress, LinearProgress
} from '@mui/material';
import { WarningAmber, WhatsApp as WhatsAppIcon } from '@mui/icons-material';

const LowStock = () => {
  const navigate = useNavigate();
  const [sarees, setSarees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Request Stock Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [selectedBeamName, setSelectedBeamName] = useState('');
  const [selectedSeriesCode, setSelectedSeriesCode] = useState('');
  const [selectedSareeId, setSelectedSareeId] = useState('');

  const fetchLowStockSarees = async () => {
    setLoading(true);
    try {
      const { data } = await sareeAPI.getAll({ status: 'low', limit: 100 });
      setSarees(data.sarees || []);
    } catch (error) {
      console.error('Failed to load low stock sarees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLowStockSarees(); }, []);

  // Real-time subscriptions
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('realtime-low-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combinations' }, () => fetchLowStockSarees())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sarees' }, () => fetchLowStockSarees())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Build a flat list of low-stock combinations across all sarees
  const lowItems = [];
  sarees.forEach(saree => {
    (saree.beams || []).forEach(beam => {
      (beam.combinations || []).forEach(combo => {
        const stock = combo.current_stock ?? 0;
        const min = combo.minimum_stock ?? 20;
        if (stock <= min) {
          lowItems.push({ saree, beam, combo, stock, min, shortage: Math.max(0, min - stock) });
        }
      });
    });
    // Also include sarees with aggregated low stock but no combination-level data
    if ((!saree.beams || saree.beams.length === 0) && (saree.total_stock ?? 0) <= (saree.min_stock ?? 20)) {
      lowItems.push({ saree, beam: null, combo: null, stock: saree.total_stock ?? 0, min: saree.min_stock ?? 20, shortage: Math.max(0, (saree.min_stock ?? 20) - (saree.total_stock ?? 0)) });
    }
  });

  // Sort: out of stock first, then by shortage desc
  lowItems.sort((a, b) => {
    if (a.stock === 0 && b.stock !== 0) return -1;
    if (b.stock === 0 && a.stock !== 0) return 1;
    return b.shortage - a.shortage;
  });

  const openRequest = (item) => {
    if (!item.combo) {
      navigate(`/sarees/${item.saree.id}`);
      return;
    }
    setSelectedCombo(item.combo);
    setSelectedBeamName(item.beam?.beam_name || 'Beam');
    setSelectedSeriesCode(item.saree.series_code || '');
    setSelectedSareeId(item.saree.id);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <WarningAmber sx={{ color: 'warning.main' }} /> Needs Stock
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Items below minimum stock levels. Request stock directly from this page.
        </Typography>
      </Box>

      {lowItems.length === 0 ? (
        <Alert severity="success" sx={{ borderRadius: 3, p: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>All stock levels are healthy!</Typography>
          No items are currently below their minimum stock thresholds.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {lowItems.map((item, idx) => {
            const health = getStockHealth(item.stock, item.min);
            const isCritical = item.stock === 0;
            const pct = item.min > 0 ? Math.round((item.stock / item.min) * 100) : 0;

            return (
              <Paper
                key={`${item.saree.id}-${item.combo?.id || idx}`}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeft: `4px solid ${health.color}`,
                  transition: 'box-shadow 0.15s',
                  '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }
                }}
              >
                {/* Top: severity badge */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => navigate(`/sarees/${item.saree.id}`)}>
                        {item.saree.series_code}
                      </Typography>
                      <Chip
                        label={isCritical ? 'CRITICAL' : 'LOW'}
                        size="small"
                        sx={{
                          height: 20, fontSize: '0.62rem', fontWeight: 800,
                          bgcolor: isCritical ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                          color: isCritical ? 'error.main' : 'warning.dark'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {item.beam ? `${item.beam.beam_name} · ` : ''}{item.combo?.combination_name || item.saree.sari_name || 'Unnamed'}
                    </Typography>
                  </Box>
                </Box>

                {/* Stock info */}
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: health.color }}>{item.stock} pcs</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Minimum</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.min} pcs</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shortage</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'error.main' }}>−{item.shortage} pcs</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 120 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(pct, 100)}
                      sx={{
                        height: 6, borderRadius: 3, bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: health.color }
                      }}
                    />
                  </Box>
                </Box>

                {/* Action */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<WhatsAppIcon />}
                    onClick={() => openRequest(item)}
                    sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                  >
                    Request Stock
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/sarees/${item.saree.id}`)}
                    sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
                  >
                    View Details
                  </Button>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Request Stock Dialog */}
      <RequestStockDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        combination={selectedCombo}
        beamName={selectedBeamName}
        seriesCode={selectedSeriesCode}
        sareeId={selectedSareeId}
        initialMovementType="STOCK_IN"
        onSuccess={() => {
          fetchLowStockSarees();
          setDialogOpen(false);
        }}
      />
    </Box>
  );
};

export default LowStock;
