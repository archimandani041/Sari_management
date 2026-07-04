/**
 * Settings Page
 * Application settings management (Admin only)
 */
import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import {
  Box, Paper, TextField, Button, Typography, Grid, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Save } from '@mui/icons-material';

const Settings = () => {
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [themeMode, setThemeMode] = useState('light');
  const [defaultMinStock, setDefaultMinStock] = useState(20);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await settingsAPI.get();
        if (data.settings) {
          setCompanyName(data.settings.company_name || '');
          setLogoUrl(data.settings.logo_url || '');
          setThemeMode(data.settings.theme || 'light');
          setDefaultMinStock(data.settings.default_minimum_stock || 20);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load application settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await settingsAPI.update({
        company_name: companyName,
        logo_url: logoUrl,
        theme: themeMode,
        default_minimum_stock: defaultMinStock
      });
      setSuccess('Settings updated successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 650 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
          System Settings
        </Typography>
        <Typography variant="subtitle1">
          Configure company details, branding metadata, and default thresholds
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Paper sx={{ p: 4, borderRadius: 4 }} component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Company/Shop Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Logo Image URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Default UI Theme</InputLabel>
              <Select value={themeMode} label="Default UI Theme" onChange={(e) => setThemeMode(e.target.value)}>
                <MenuItem value="light">Light Mode</MenuItem>
                <MenuItem value="dark">Dark Mode</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="number"
              label="Default Minimum Stock Level"
              value={defaultMinStock}
              onChange={(e) => setDefaultMinStock(parseInt(e.target.value) || 0)}
              required
            />
          </Grid>
          <Grid size={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<Save />}
              disabled={saving}
              sx={{ py: 1.2, mt: 1 }}
            >
              {saving ? 'Saving changes...' : 'Save Settings'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Settings;
