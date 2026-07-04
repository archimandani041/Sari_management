/**
 * Low Stock Management Page
 * Displays low stock alerts with warning visual indications and critical action triggers
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sareeAPI } from '../services/api';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, Chip, Avatar, Button, Alert, CircularProgress
} from '@mui/material';
import { WarningAmber } from '@mui/icons-material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useAuth } from '../contexts/AuthContext';

const LowStock = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sarees, setSarees] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchLowStockSarees();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 800, color: 'warning.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmber fontSize="large" /> Low Stock & Depleted Alerts
        </Typography>
        <Typography variant="subtitle1">
          Items require replenishment. Click any row to view details and request stock via WhatsApp.
        </Typography>
      </Box>

      {sarees.length === 0 ? (
        <Alert severity="success" sx={{ borderRadius: 3, p: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>Excellent Stock Status!</Typography>
          There are currently no items matching low or out-of-stock warning levels.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'warning.light' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(245, 158, 11, 0.05)' }}>
              <TableRow>
                <TableCell>Image</TableCell>
                <TableCell>Sari Name</TableCell>
                <TableCell>Series Code</TableCell>
                <TableCell align="right">Current Stock</TableCell>
                <TableCell align="right">Minimum Limit</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sarees.map((saree) => {
                const isOutOfStock = (saree.total_stock ?? 0) === 0;
                return (
                  <TableRow
                    key={saree.id}
                    hover
                    onClick={() => navigate(`/sarees/${saree.id}`)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isOutOfStock ? 'rgba(239, 68, 68, 0.02)' : 'rgba(245, 158, 11, 0.02)',
                    }}
                  >
                    <TableCell>
                      <Avatar src={saree.image_url} variant="rounded" sx={{ width: 44, height: 44 }}>
                        🧵
                      </Avatar>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{saree.sari_name || 'Unnamed Saree'}</TableCell>
                    <TableCell>
                      <Chip label={saree.series_code} color="warning" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: isOutOfStock ? 'error.main' : 'warning.main' }}>
                      {saree.total_stock ?? 0} pcs
                    </TableCell>
                    <TableCell align="right">{saree.min_stock ?? 20}</TableCell>
                    <TableCell>
                      <Chip
                        label={isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK'}
                        color={isOutOfStock ? 'error' : 'warning'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<WhatsAppIcon fontSize="small" />}
                        onClick={() => navigate(`/sarees/${saree.id}`)}
                        sx={{ whiteSpace: 'nowrap', fontSize: '0.72rem' }}
                      >
                        Request Stock
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default LowStock;
