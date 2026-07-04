/**
 * Global Search Dialog (Ctrl+K)
 * Real-time instant search overlay
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { sareeAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Dialog, DialogContent, InputBase, Box, List, ListItemButton,
  ListItemAvatar, Avatar, ListItemText, Typography, Divider, CircularProgress
} from '@mui/material';
import { Search as SearchIcon, SearchOff } from '@mui/icons-material';

const GlobalSearchDialog = () => {
  const { searchOpen, setSearchOpen } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await sareeAPI.getAll({ search: debouncedQuery, limit: 10 });
        setResults(data.sarees || []);
      } catch (error) {
        console.error('Failed to perform search:', error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSearchOpen(false);
  };

  const handleItemClick = (id) => {
    handleClose();
    navigate(`/sarees/${id}`);
  };

  return (
    <Dialog
      open={searchOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            top: '-15%', // Open slightly higher up
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }
        }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <SearchIcon color="primary" sx={{ fontSize: 24 }} />
        <InputBase
          placeholder="Search sari name, series code, variant color, company..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          fullWidth
          sx={{ fontSize: '1rem', flex: 1 }}
        />
        {loading && <CircularProgress size={20} />}
      </Box>
      <Divider />
      <DialogContent sx={{ p: 0, maxHeight: 350, overflowY: 'auto' }}>
        {query.trim() === '' ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Type to start searching...
            </Typography>
          </Box>
        ) : results.length === 0 && !loading ? (
          <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <SearchOff color="disabled" sx={{ fontSize: 40 }} />
            <Typography variant="body2" color="text.secondary">
              No sarees found matching "{query}"
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {results.map((saree) => (
              <ListItemButton
                key={saree.id}
                onClick={() => handleItemClick(saree.id)}
                sx={{
                  py: 1.5,
                  px: 2.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' }
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={saree.image_url || '/placeholder-sari.png'}
                    variant="rounded"
                    sx={{ width: 44, height: 44, bgcolor: 'primary.light' }}
                  >
                    🧵
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={saree.sari_name}
                  secondary={
                    <Typography variant="caption" color="text.secondary" component="span">
                      Code: <Typography variant="caption" component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {saree.series_code}
                      </Typography>
                      {saree.color_variants && saree.color_variants.length > 0 && (
                        <span> | Variants: {saree.color_variants.map(v => `${v.color_name} (${v.company_name})`).join(', ')}</span>
                      )}
                    </Typography>
                  }
                  slotProps={{ primary: { fontSize: '0.9rem', fontWeight: 600 } }}
                />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} color={saree.current_stock === 0 ? 'error.main' : saree.current_stock <= saree.minimum_stock ? 'warning.main' : 'success.main'}>
                    {saree.current_stock} pcs
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Stock
                  </Typography>
                </Box>
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearchDialog;
