import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, sareeAPI } from '../services/api';
import { supabase } from '../services/supabase';
import {
  Grid, Paper, Box, Typography, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Button, useTheme, Skeleton, Chip, MenuItem, Select, FormControl,
  ButtonGroup, Autocomplete, TextField, LinearProgress,
  List, ListItem, ListItemIcon, ListItemText, Divider, Collapse, IconButton,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  WarningAmber as WarningIcon,
  Checkroom as SareeIcon,
  GridOn as GridIcon,
  ShoppingCart as PurchaseIcon,
  LocalShipping as DeliveryIcon,
  Schedule as PendingIcon,
  Bolt as InsightsIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Error as ErrorIcon,
  ChevronRight as ChevronRightIcon,
  SwapVert as SwapVertIcon,
  AutoAwesome as SparklesIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  // State Management
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30days');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [grouping, setGrouping] = useState('daily');
  const [realtimeStatus, setRealtimeStatus] = useState('offline');

  // Saree Prediction State
  const [sareesList, setSareesList] = useState([]);
  const [selectedSaree, setSelectedSaree] = useState(null);
  const [forecastHorizon, setForecastHorizon] = useState(30);
  const [predictionData, setPredictionData] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [expandedBeam, setExpandedBeam] = useState(null);
  const [showPredictionBreakdown, setShowPredictionBreakdown] = useState(false);

  // Fetch Dashboard Stats
  const fetchDashboardData = useCallback(async () => {
    try {
      const params = {
        range: dateRange,
        grouping
      };
      if (dateRange === 'custom') {
        params.customStart = customDates.start;
        params.customEnd = customDates.end;
      }
      const response = await dashboardAPI.get(params);
      setData(response.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customDates, grouping]);

  // Fetch all Sarees for prediction dropdown
  const fetchSareesList = useCallback(async () => {
    try {
      const response = await sareeAPI.getAll();
      setSareesList(response.data.sarees || []);
      if (response.data.sarees?.length > 0 && !selectedSaree) {
        setSelectedSaree(response.data.sarees[0]);
      }
    } catch (err) {
      console.error('Failed to fetch sarees list:', err);
    }
  }, [selectedSaree]);

  // Fetch Prediction details
  const fetchPrediction = useCallback(async (sareeId, horizon) => {
    if (!sareeId) return;
    setLoadingPrediction(true);
    try {
      const response = await dashboardAPI.predict({ sareeId, horizon });
      setPredictionData(response.data);
    } catch (err) {
      console.error('Failed to load prediction data:', err);
    } finally {
      setLoadingPrediction(false);
    }
  }, []);

  // Setup initial fetch
  useEffect(() => {
    fetchDashboardData();
    fetchSareesList();
  }, [fetchDashboardData, fetchSareesList]);

  // Handle selected saree prediction updates
  useEffect(() => {
    if (selectedSaree?.id) {
      fetchPrediction(selectedSaree.id, forecastHorizon);
    }
  }, [selectedSaree, forecastHorizon, fetchPrediction]);

  // Real-time Supabase subscriptions
  useEffect(() => {
    if (!supabase) {
      setRealtimeStatus('disabled');
      return;
    }

    setRealtimeStatus('connecting');

    const channel = supabase
      .channel('realtime-dashboard-updates-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_history' }, () => {
        fetchDashboardData();
        if (selectedSaree?.id) {
          fetchPrediction(selectedSaree.id, forecastHorizon);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combinations' }, () => {
        fetchDashboardData();
        if (selectedSaree?.id) {
          fetchPrediction(selectedSaree.id, forecastHorizon);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('live');
        } else {
          setRealtimeStatus('offline');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData, fetchPrediction, selectedSaree, forecastHorizon]);

  // Premium Custom Styles
  const glassCard = {
    backgroundColor: theme.palette.glass?.bg || 'rgba(255, 255, 255, 0.45)',
    backdropFilter: theme.palette.glass?.blur || 'blur(16px)',
    WebkitBackdropFilter: theme.palette.glass?.blur || 'blur(16px)',
    border: `1px solid ${theme.palette.glass?.border || 'rgba(255, 255, 255, 0.5)'}`,
    boxShadow: theme.palette.glass?.shadow || '0 8px 32px rgba(29, 29, 29, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.palette.glass?.shadowHover || '0 16px 48px rgba(0, 0, 0, 0.15)',
    }
  };

  const gradientText = {
    background: isLight 
      ? 'linear-gradient(135deg, #776F4F 0%, #A16D47 100%)' 
      : 'linear-gradient(135deg, #F7F3EB 0%, #C0AD8D 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 800
  };

  const tooltipStyle = {
    backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 27, 22, 0.95)',
    backdropFilter: 'blur(8px)',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    color: theme.palette.text.primary,
    fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
  };

  // KPI Calculations
  const stats = data?.stats || {
    totalSarees: 0, currentStock: 0, delivered: 0, added: 0,
    comparison: { deliveredPercent: 0, addedPercent: 0, prevDelivered: 0, prevAdded: 0 },
    lowStock: 0, outOfStock: 0, pendingRequests: 0, inDelivery: 0
  };

  const sparklines = data?.sparklines || { sarees: [], stock: [], delivered: [], added: [] };
  const aiBrief = data?.aiBrief || [];
  const stockMovement = data?.stockMovement || [];
  const topPerforming = data?.topPerforming || [];
  const needsAttention = data?.needsAttention || [];
  const opportunities = data?.opportunities || [];
  const recentActivity = data?.recentActivity || [];

  // Helper values for Stock Movement Analytics side statistics
  const activeDays = dateRange === 'today' ? 1 : (dateRange === '7days' ? 7 : (dateRange === '30days' ? 30 : (dateRange === '3months' ? 90 : (dateRange === '6months' ? 180 : (dateRange === '12months' ? 365 : 30)))));
  const avgDailyDelivery = Math.round((stats.delivered / activeDays) * 10) / 10;
  const stockTurnover = stats.currentStock > 0 ? Math.round((stats.delivered / stats.currentStock) * 1000) / 10 : 0;
  const stockDemandRatio = avgDailyDelivery > 0 ? Math.round((stats.currentStock / avgDailyDelivery) * 10) / 10 : 999;

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 1, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
      
      {/* SECTION A: DASHBOARD HEADER */}
      <Paper sx={{ ...glassCard, p: 3, mb: 3 }} elevation={0}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant="h2" sx={{ fontSize: { xs: '1.65rem', md: '2.1rem' }, ...gradientText }}>
                Inventory Intelligence
              </Typography>
              {/* Real-time Status Chip */}
              <Chip
                label={realtimeStatus === 'live' ? 'Live Connection' : realtimeStatus === 'connecting' ? 'Syncing...' : 'Offline'}
                size="small"
                avatar={
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: realtimeStatus === 'live' ? 'success.main' : realtimeStatus === 'connecting' ? 'warning.main' : 'text.disabled',
                      animation: realtimeStatus === 'live' ? 'pulse 1.5s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' },
                        '70%': { transform: 'scale(1.2)', boxShadow: '0 0 0 5px rgba(34, 197, 94, 0)' },
                        '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' }
                      }
                    }}
                  />
                }
                sx={{
                  bgcolor: realtimeStatus === 'live' ? 'rgba(34, 197, 94, 0.12)' : 'action.selected',
                  color: realtimeStatus === 'live' ? 'success.dark' : 'text.secondary',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  border: realtimeStatus === 'live' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid transparent',
                  px: 0.5
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Live stock health tracking, transaction audits, and machine-learning predictions.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap', alignItems: 'center' }}>
              
              {/* Custom Date Range Pickers (conditional) */}
              {dateRange === 'custom' && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    type="date"
                    size="small"
                    value={customDates.start}
                    onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                    sx={{ width: 135 }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>to</Typography>
                  <TextField
                    type="date"
                    size="small"
                    value={customDates.end}
                    onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                    sx={{ width: 135 }}
                  />
                </Box>
              )}

              {/* Date Range Selector */}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  sx={{ 
                    borderRadius: 2.5, 
                    bgcolor: isLight ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.03)',
                    fontWeight: 700 
                  }}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="7days">Last 7 Days</MenuItem>
                  <MenuItem value="30days">Last 30 Days</MenuItem>
                  <MenuItem value="3months">Last 3 Months</MenuItem>
                  <MenuItem value="6months">Last 6 Months</MenuItem>
                  <MenuItem value="12months">Last 12 Months</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>

              {/* Refresh Button */}
              <IconButton
                onClick={() => {
                  setLoading(true);
                  fetchDashboardData();
                  if (selectedSaree?.id) fetchPrediction(selectedSaree.id, forecastHorizon);
                }}
                color="primary"
                sx={{ 
                  border: `1px solid ${theme.palette.divider}`, 
                  borderRadius: 2.5, 
                  p: 1,
                  bgcolor: isLight ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.03)'
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION B: LIVE KPI CARDS */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* KPI 1: Total Sarees */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ ...glassCard, '&:hover': { ...glassCard['&:hover'], boxShadow: '0 12px 36px rgba(161, 109, 71, 0.15)' } }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 150, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Total Sarees
                </Typography>
                <Box sx={{ color: 'primary.main', bgcolor: 'rgba(161, 109, 71, 0.12)', p: 1, borderRadius: 2.5 }}>
                  <SareeIcon />
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, mb: 1 }}>
                {loading ? <Skeleton width="60%" height={40} /> : (
                  <Typography variant="h3" sx={{ fontWeight: 850, color: 'text.primary', letterSpacing: '-0.5px' }}>
                    {stats.totalSarees}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                  Master catalog items
                </Typography>
              </Box>
              {/* Sparkline Area Chart */}
              <Box sx={{ height: 40, mt: 1.5 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklines.sarees}>
                    <defs>
                      <linearGradient id="colorSarees" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={theme.palette.primary.main} strokeWidth={2} fillOpacity={1} fill="url(#colorSarees)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* KPI 2: Current Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ ...glassCard, '&:hover': { ...glassCard['&:hover'], boxShadow: '0 12px 36px rgba(192, 173, 141, 0.15)' } }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 150, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Current Stock
                </Typography>
                <Box sx={{ color: 'secondary.main', bgcolor: 'rgba(192, 173, 141, 0.12)', p: 1, borderRadius: 2.5 }}>
                  <GridIcon />
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, mb: 1 }}>
                {loading ? <Skeleton width="60%" height={40} /> : (
                  <Typography variant="h3" sx={{ fontWeight: 850, color: 'text.primary', letterSpacing: '-0.5px' }}>
                    {stats.currentStock.toLocaleString()} <Box component="span" sx={{ fontSize: '1.2rem', fontWeight: 600 }}>pcs</Box>
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                  Total physical units
                </Typography>
              </Box>
              {/* Sparkline Area Chart */}
              <Box sx={{ height: 40, mt: 1.5 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklines.stock}>
                    <defs>
                      <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={theme.palette.secondary.main} strokeWidth={2} fillOpacity={1} fill="url(#colorStock)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* KPI 3: Delivered */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ ...glassCard, '&:hover': { ...glassCard['&:hover'], boxShadow: '0 12px 36px rgba(239, 68, 68, 0.12)' } }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 150, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Delivered (Outflow)
                </Typography>
                <Box sx={{ color: 'error.main', bgcolor: 'rgba(239, 68, 68, 0.1)', p: 1, borderRadius: 2.5 }}>
                  <DeliveryIcon />
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, mb: 1 }}>
                {loading ? <Skeleton width="60%" height={40} /> : (
                  <Typography variant="h3" sx={{ fontWeight: 850, color: 'text.primary', letterSpacing: '-0.5px' }}>
                    {stats.delivered.toLocaleString()} <Box component="span" sx={{ fontSize: '1.2rem', fontWeight: 600 }}>pcs</Box>
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={`${stats.comparison.deliveredPercent >= 0 ? '↑' : '↓'} ${Math.abs(stats.comparison.deliveredPercent)}%`}
                    color={stats.comparison.deliveredPercent >= 0 ? 'success' : 'error'}
                    size="small"
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, borderRadius: 1.5 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                    vs prior period
                  </Typography>
                </Box>
              </Box>
              {/* Sparkline Area Chart */}
              <Box sx={{ height: 40, mt: 1.5 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklines.delivered}>
                    <defs>
                      <linearGradient id="colorDeliveredKpi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={theme.palette.error.main} strokeWidth={2} fillOpacity={1} fill="url(#colorDeliveredKpi)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* KPI 4: Stock Added */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ ...glassCard, '&:hover': { ...glassCard['&:hover'], boxShadow: '0 12px 36px rgba(34, 197, 94, 0.12)' } }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 150, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Stock Added (Inflow)
                </Typography>
                <Box sx={{ color: 'success.main', bgcolor: 'rgba(34, 197, 94, 0.1)', p: 1, borderRadius: 2.5 }}>
                  <PurchaseIcon />
                </Box>
              </Box>
              <Box sx={{ mt: 1.5, mb: 1 }}>
                {loading ? <Skeleton width="60%" height={40} /> : (
                  <Typography variant="h3" sx={{ fontWeight: 850, color: 'text.primary', letterSpacing: '-0.5px' }}>
                    {stats.added.toLocaleString()} <Box component="span" sx={{ fontSize: '1.2rem', fontWeight: 600 }}>pcs</Box>
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={`${stats.comparison.addedPercent >= 0 ? '↑' : '↓'} ${Math.abs(stats.comparison.addedPercent)}%`}
                    color={stats.comparison.addedPercent >= 0 ? 'success' : 'error'}
                    size="small"
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, borderRadius: 1.5 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                    vs prior period
                  </Typography>
                </Box>
              </Box>
              {/* Sparkline Area Chart */}
              <Box sx={{ height: 40, mt: 1.5 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklines.added}>
                    <defs>
                      <linearGradient id="colorAddedKpi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={theme.palette.success.main} strokeWidth={2} fillOpacity={1} fill="url(#colorAddedKpi)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SECONDARY ALERT STRIP */}
      <Paper sx={{ ...glassCard, py: 2, px: 3, mb: 3 }} elevation={0}>
        <Grid container spacing={2} justifyContent="space-around" alignItems="center">
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.8 } }} onClick={() => navigate('/low-stock')}>
              <Box sx={{ bgcolor: 'rgba(245, 158, 11, 0.12)', p: 0.8, borderRadius: 1.5, display: 'flex' }}>
                <WarningIcon color="warning" fontSize="small" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.88rem' }}>
                Low Stock: <Box component="span" sx={{ color: 'warning.main', fontWeight: 900 }}>{stats.lowStock}</Box> items
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.8 } }} onClick={() => navigate('/sarees?status=out')}>
              <Box sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', p: 0.8, borderRadius: 1.5, display: 'flex' }}>
                <ErrorIcon color="error" fontSize="small" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.88rem' }}>
                Out of Stock: <Box component="span" sx={{ color: 'error.main', fontWeight: 900 }}>{stats.outOfStock}</Box> items
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.8 } }} onClick={() => navigate('/stock-requests')}>
              <Box sx={{ bgcolor: 'rgba(56, 189, 248, 0.12)', p: 0.8, borderRadius: 1.5, display: 'flex' }}>
                <PendingIcon color="info" fontSize="small" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.88rem' }}>
                Pending Requests: <Box component="span" sx={{ color: 'info.main', fontWeight: 900 }}>{stats.pendingRequests}</Box>
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ bgcolor: 'rgba(192, 173, 141, 0.15)', p: 0.8, borderRadius: 1.5, display: 'flex' }}>
                <DeliveryIcon color="secondary" fontSize="small" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.88rem' }}>
                In Delivery: <Box component="span" sx={{ color: 'secondary.main', fontWeight: 900 }}>{stats.inDelivery}</Box> items
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* SECTION C: AI INVENTORY BRIEF */}
      {aiBrief.length > 0 && (
        <Paper sx={{ ...glassCard, p: 3, mb: 3 }} elevation={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <SparklesIcon color="primary" />
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.3px' }}>AI Inventory Brief</Typography>
          </Box>
          <Grid container spacing={2.5}>
            {aiBrief.map((brief) => (
              <Grid size={{ xs: 12, md: 6 }} key={brief.id}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2.5,
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    borderLeft: `5px solid ${
                      brief.severity === 'warning' 
                        ? theme.palette.warning.main 
                        : brief.severity === 'success' 
                          ? theme.palette.success.main 
                          : theme.palette.primary.main
                    }`,
                    bgcolor: isLight ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.015)',
                    height: '100%',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {brief.severity === 'warning' ? (
                      <WarningIcon color="warning" sx={{ fontSize: '1.8rem' }} />
                    ) : brief.severity === 'success' ? (
                      <TrendingUpIcon color="success" sx={{ fontSize: '1.8rem' }} />
                    ) : (
                      <InsightsIcon color="info" sx={{ fontSize: '1.8rem' }} />
                    )}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.92rem', mb: 0.2 }}>{brief.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{brief.explanation}</Typography>
                    </Box>
                  </Box>
                  {brief.action && brief.route && (
                    <Button 
                      variant="contained" 
                      color={brief.severity === 'warning' ? 'warning' : 'primary'}
                      size="small" 
                      onClick={() => navigate(brief.route)} 
                      sx={{ ml: 2, flexShrink: 0, boxShadow: 'none', borderRadius: 2 }}
                    >
                      {brief.action}
                    </Button>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* SECTION D: STOCK MOVEMENT ANALYTICS */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Main Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ ...glassCard, p: 3, height: 420 }} elevation={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>Stock In vs Stock Out</Typography>
              <ButtonGroup size="small" variant="outlined" color="primary" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <Button variant={grouping === 'daily' ? 'contained' : 'outlined'} onClick={() => setGrouping('daily')} sx={{ px: 2 }}>Daily</Button>
                <Button variant={grouping === 'weekly' ? 'contained' : 'outlined'} onClick={() => setGrouping('weekly')} sx={{ px: 2 }}>Weekly</Button>
                <Button variant={grouping === 'monthly' ? 'contained' : 'outlined'} onClick={() => setGrouping('monthly')} sx={{ px: 2 }}>Monthly</Button>
              </ButtonGroup>
            </Box>
            {loading ? (
              <Skeleton variant="rectangular" height="75%" sx={{ borderRadius: 2 }} />
            ) : stockMovement.length === 0 ? (
              <Box sx={{ height: '75%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary" sx={{ fontWeight: 600 }}>More stock movement history is needed to generate this trend.</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={stockMovement}>
                  <defs>
                    <linearGradient id="colorAddedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorDeliveredGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                  <XAxis dataKey="label" stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} />
                  <YAxis stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" dataKey="stockAdded" name="Stock Added" stroke="#22C55E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAddedGrad)" />
                  <Area type="monotone" dataKey="stockDelivered" name="Stock Delivered" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDeliveredGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Side Panel for Analytics */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ ...glassCard, p: 3, height: 420, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} elevation={0}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Stock Health Analytics</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3, fontWeight: 600 }}>
                Aggregated parameters of warehouse transactions
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                      Stock Turnover Rate
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, mt: 0.2 }}>
                      Percentage of current stock delivered
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>
                    {stockTurnover}%
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                      Average Daily Outflow
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, mt: 0.2 }}>
                      Average volume shipped daily
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>
                    {avgDailyDelivery} <Box component="span" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>pcs</Box>
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                      Stock Cover Ratio
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, mt: 0.2 }}>
                      Warehouse supply remaining duration
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: stockDemandRatio < 15 ? 'warning.main' : 'success.main' }}>
                    {stockDemandRatio === 999 ? '∞' : `${stockDemandRatio} Days`}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, pt: 2, mt: 2 }}>
              <Button 
                variant="outlined" 
                size="small" 
                fullWidth 
                endIcon={<ArrowForwardIcon />} 
                onClick={() => navigate('/history')}
                sx={{ borderRadius: 2, py: 1, fontWeight: 700 }}
              >
                View Full Audit History
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* SECTION E: SAREE DEMAND PREDICTION */}
      <Paper sx={{ ...glassCard, p: 3, mb: 3 }} elevation={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Saree Demand Prediction Engine</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              Calculates rolling averages, demand volatility, safety stocks, and future horizons.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search / Select Saree */}
            <Autocomplete
              size="small"
              options={sareesList}
              getOptionLabel={(option) => `${option.series_code} (${option.sari_name || 'Unnamed'})`}
              value={selectedSaree}
              onChange={(event, newValue) => setSelectedSaree(newValue)}
              renderInput={(params) => <TextField {...params} label="Select Saree" />}
              sx={{ width: 230 }}
            />
            {/* Horizon Selector */}
            <ButtonGroup size="small" variant="outlined" color="primary" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
              {[7, 15, 30, 60, 90].map((h) => (
                <Button
                  key={h}
                  variant={forecastHorizon === h ? 'contained' : 'outlined'}
                  onClick={() => setForecastHorizon(h)}
                  sx={{ px: 1.8 }}
                >
                  {h} Days
                </Button>
              ))}
            </ButtonGroup>
          </Box>
        </Box>

        {loadingPrediction ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}><Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} /></Grid>
            <Grid size={{ xs: 12, md: 8 }}><Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} /></Grid>
          </Grid>
        ) : !predictionData ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ fontWeight: 650 }}>Please select a Saree to generate predictions.</Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Metric Panel */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: 'transparent', borderColor: theme.palette.divider }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.8px' }}>
                    Saree Code
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, mb: 2.5, color: 'primary.main', letterSpacing: '-0.5px' }}>
                    {predictionData.saree?.seriesCode}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Current Stock</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{predictionData.forecast?.currentStock} pcs</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Avg Daily Demand</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{predictionData.forecast?.avgDailyDemand} pcs</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{forecastHorizon}-Day Forecast</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{predictionData.forecast?.forecastDemand} pcs</Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Expected Deficit</Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          color: (predictionData.forecast?.currentStock - predictionData.forecast?.forecastDemand) < 0 ? 'error.main' : 'text.primary'
                        }}
                      >
                        {Math.min(0, predictionData.forecast?.currentStock - predictionData.forecast?.forecastDemand)} pcs
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Recommended Additional Stock</Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 900,
                        color: predictionData.forecast?.recommendedOrderQty > 0 ? 'warning.main' : 'success.main',
                        mb: 1.5,
                        mt: 0.5
                      }}
                    >
                      {predictionData.forecast?.recommendedOrderQty > 0 ? `+ ${predictionData.forecast.recommendedOrderQty} pcs` : 'Stock Levels Optimal'}
                    </Typography>

                    {predictionData.forecast?.recommendedOrderQty > 0 && (
                      <Button
                        variant="contained"
                        color="warning"
                        size="small"
                        fullWidth
                        onClick={() => navigate(`/sarees/${predictionData.saree?.id}`)}
                        sx={{ py: 1, borderRadius: 2, fontWeight: 700 }}
                      >
                        Initiate Stock Request
                      </Button>
                    )}
                  </Box>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Forecast Confidence</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>{predictionData.forecast?.confidence}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={predictionData.forecast?.confidence} sx={{ height: 6, borderRadius: 3 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, alignItems: 'center' }}>
                    <Chip
                      label={`Risk: ${predictionData.forecast?.stockoutRisk}`}
                      color={
                        predictionData.forecast?.stockoutRisk === 'CRITICAL' || predictionData.forecast?.stockoutRisk === 'HIGH'
                          ? 'error'
                          : predictionData.forecast?.stockoutRisk === 'MODERATE' ? 'warning' : 'success'
                      }
                      size="small"
                      sx={{ fontWeight: 800, px: 0.5 }}
                    />
                    <Chip
                      label={`Confidence: ${predictionData.forecast?.dataQuality}`}
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: '0.65rem', fontWeight: 700 }}
                    />
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Chart & AI Explanation Panel */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Grid container spacing={2.5} style={{ height: '100%' }}>
                {/* Visual Chart */}
                <Grid size={12} style={{ height: '55%' }}>
                  <ResponsiveContainer width="100%" height={170}>
                    <AreaChart data={predictionData.chartPoints}>
                      <defs>
                        <linearGradient id="predictedSareeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                      <XAxis dataKey="label" stroke={theme.palette.text.secondary} fontSize={10} tickLine={false} />
                      <YAxis stroke={theme.palette.text.secondary} fontSize={10} tickLine={false} />
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <ReferenceLine x={predictionData.chartPoints[29]?.label} stroke={theme.palette.primary.main} strokeDasharray="5 5" label={{ value: 'Prediction Line', position: 'top', fill: theme.palette.text.secondary, fontSize: 10, fontWeight: 700 }} />
                      <Area type="monotone" dataKey="historical" name="Historical Deliveries" stroke={theme.palette.primary.main} fill="url(#predictedSareeGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="forecast" name="Forecast Demand" stroke={theme.palette.secondary.main} strokeDasharray="5 5" fill="none" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Grid>

                {/* Gemini AI explanation */}
                <Grid size={12}>
                  <Box sx={{ p: 2.5, bgcolor: isLight ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.01)', borderRadius: 3.5, border: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <SparklesIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>AI Performance Assessment</Typography>
                    </Box>
                    
                    <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic', color: 'text.primary', fontWeight: 500, lineHeight: 1.5 }}>
                      "{predictionData.aiAnalysis?.summary || 'AI explanation temporarily unavailable.'}"
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.8, color: 'error.main', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Identified Risks</Typography>
                        {predictionData.aiAnalysis?.risks?.map((risk, idx) => (
                          <Typography key={idx} variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 500, mb: 0.4 }}>• {risk}</Typography>
                        )) || <Typography variant="caption" color="text.secondary">• No operational risk detected.</Typography>}
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.8, color: 'success.main', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommended Actions</Typography>
                        {predictionData.aiAnalysis?.actions?.map((act, idx) => (
                          <Typography key={idx} variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 500, mb: 0.4 }}>• {act}</Typography>
                        )) || <Typography variant="caption" color="text.secondary">• Stock levels optimal.</Typography>}
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
            </Grid>

            {/* Tree/Breakdown Accordion */}
            <Grid size={12}>
              <Box sx={{ pt: 1.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={showPredictionBreakdown ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => setShowPredictionBreakdown(!showPredictionBreakdown)}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  {showPredictionBreakdown ? 'Hide Saree Breakdown' : 'Expand Hierarchical Saree Breakdown'}
                </Button>

                <Collapse in={showPredictionBreakdown} sx={{ mt: 2 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3.5, bgcolor: 'transparent', borderColor: theme.palette.divider }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                      Stock Prediction breakdown (Beams → Combinations)
                    </Typography>
                    
                    {(predictionData.beamsBreakdown || []).map((beam) => (
                      <Box key={beam.id} sx={{ mb: 2, borderBottom: `1px solid ${theme.palette.divider}`, pb: 1.5 }}>
                        <Box
                          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', py: 0.5 }}
                          onClick={() => setExpandedBeam(expandedBeam === beam.id ? null : beam.id)}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                            {expandedBeam === beam.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            {beam.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                            Stock: {beam.currentStock} pcs | Forecast: {beam.forecastDemand} | Rec: <Box component="span" sx={{ fontWeight: 800, color: beam.recommendedOrderQty > 0 ? 'warning.main' : 'text.secondary' }}>+{beam.recommendedOrderQty} pcs</Box>
                          </Typography>
                        </Box>
                        
                        <Collapse in={expandedBeam === beam.id}>
                          <List dense sx={{ pl: 3.5, mt: 1 }}>
                            {(beam.combinations || []).map((combo) => (
                              <ListItem key={combo.id} sx={{ py: 0.5, borderLeft: `1px dashed ${theme.palette.divider}` }}>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {combo.name} 
                                        <Chip label={combo.brand || 'KP'} size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800 }} />
                                        <Chip label={combo.status || 'In Stock'} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800 }} />
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        Stock: {combo.currentStock} pcs | Forecast: {combo.forecastDemand} | Rec: <Box component="span" sx={{ fontWeight: 800, color: combo.recommendedOrderQty > 0 ? 'warning.main' : 'success.main' }}>+{combo.recommendedOrderQty} pcs</Box>
                                      </Typography>
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Collapse>
                      </Box>
                    ))}
                  </Paper>
                </Collapse>
              </Box>
            </Grid>
          </Grid>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2.5, textAlign: 'center', fontStyle: 'italic', fontWeight: 500 }}>
          “Forecasts are estimates based on historical stock movement and recent demand patterns.”
        </Typography>
      </Paper>

      {/* SECTION F: INVENTORY RISK & OPPORTUNITIES */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Left: Needs Attention */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ ...glassCard, p: 3, minHeight: 340 }} elevation={0}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, color: 'error.main' }}>Needs Attention</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Saree / Combination</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Risk Type</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Details</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {needsAttention.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{item.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.type}
                          color={item.severity === 'error' ? 'error' : item.severity === 'warning' ? 'warning' : 'info'}
                          size="small"
                          sx={{ fontSize: '0.65rem', fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{item.detail}</TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="text" onClick={() => navigate(`/sarees/${item.sareeId}`)} sx={{ fontWeight: 700 }}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {needsAttention.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>No items need attention right now.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Right: Opportunities */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ ...glassCard, p: 3, minHeight: 340 }} elevation={0}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, color: 'success.main' }}>Opportunities</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Saree / Combination</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Metric Type</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Details</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {opportunities.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{item.name}</TableCell>
                      <TableCell>
                        <Chip label={item.type} color="success" variant="outlined" size="small" sx={{ fontSize: '0.65rem', fontWeight: 800 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{item.detail}</TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="text" onClick={() => navigate(`/sarees/${item.sareeId}`)} sx={{ fontWeight: 700 }}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {opportunities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>No opportunities calculated for this range.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* SECTION G & H: TOP PERFORMING SAREES & RECENT ACTIVITY */}
      <Grid container spacing={3}>
        {/* Top Performing */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ ...glassCard, p: 3, minHeight: 380 }} elevation={0}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Top Performing Sarees</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }} align="center">Rank</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Saree Code</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Delivered</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Current Stock</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Demand Trend</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Stock Cover</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topPerforming.map((saree, index) => (
                    <TableRow key={saree.code} hover>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>{index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{saree.code}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{saree.delivered} pcs</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{saree.stock} pcs</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${saree.trend >= 0 ? '+' : ''}${saree.trend}%`}
                          color={saree.trend >= 0 ? 'success' : 'error'}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={saree.daysRemaining === '∞' ? '∞' : `${saree.daysRemaining} days`}
                          variant="outlined"
                          color={saree.daysRemaining <= 15 ? 'warning' : 'primary'}
                          size="small"
                          sx={{ fontSize: '0.65rem', fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={async () => {
                            try {
                              const res = await sareeAPI.getAll({ search: saree.code });
                              const sObj = res.data.sarees?.find(s => s.series_code === saree.code);
                              if (sObj) navigate(`/sarees/${sObj.id}`);
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                        >
                          <ChevronRightIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {topPerforming.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>No sales records in active period.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ ...glassCard, p: 3, minHeight: 380, display: 'flex', flexDirection: 'column' }} elevation={0}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Recent Stock Activity</Typography>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 300 }}>
              <List dense>
                {recentActivity.map((activity, idx) => (
                  <Box key={activity.id}>
                    <ListItem alignItems="flex-start" sx={{ px: 1, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                        {activity.action === 'Increase' ? (
                          <PurchaseIcon color="success" fontSize="small" />
                        ) : activity.action === 'Decrease' ? (
                          <DeliveryIcon color="error" fontSize="small" />
                        ) : (
                          <SwapVertIcon color="info" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {activity.actionLabel}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {new Date(activity.timestamp).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, fontWeight: 500 }}>
                            {activity.sareeCode} ({activity.combinationName}) • <Box component="span" sx={{ fontWeight: 800, color: activity.action === 'Increase' ? 'success.main' : 'error.main' }}>{activity.action === 'Increase' ? '+' : '-'}{activity.qty} pcs</Box> • By {activity.user}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {idx < recentActivity.length - 1 && <Divider component="li" />}
                  </Box>
                ))}
                {recentActivity.length === 0 && (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>No recent stock activities found.</Typography>
                )}
              </List>
            </Box>
          </Paper>
        </Grid>
      </Grid>

    </Box>
  );
};

export default Dashboard;
