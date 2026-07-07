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
  Tabs, Tab
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
  Legend, ReferenceLine
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
  const [activeTab, setActiveTab] = useState(0);

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

  // Frosted surface style (single source of truth — no glass-on-glass nesting inside)
  const glassCard = {
    backgroundColor: theme.palette.glass?.bg || 'rgba(255, 255, 255, 0.45)',
    backdropFilter: theme.palette.glass?.blur || 'blur(16px)',
    WebkitBackdropFilter: theme.palette.glass?.blur || 'blur(16px)',
    border: `1px solid ${theme.palette.glass?.border || 'rgba(255, 255, 255, 0.5)'}`,
    boxShadow: theme.palette.glass?.shadow || '0 8px 32px rgba(29, 29, 29, 0.08)',
    borderRadius: 4,
    overflow: 'hidden'
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

  // Reusable compact KPI card (no sparkline clutter)
  const KpiCard = ({ label, sublabel, value, unit, icon, tint, trendPercent }) => (
    <Card sx={glassCard}>
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 138 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            {label}
          </Typography>
          <Box sx={{ color: tint, bgcolor: `${tint}1F`, p: 1, borderRadius: 2.5, display: 'flex' }}>
            {icon}
          </Box>
        </Box>
        {loading ? <Skeleton width="55%" height={44} /> : (
          <Typography variant="h3" sx={{ fontWeight: 850, color: 'text.primary', letterSpacing: '-0.5px' }}>
            {value}{unit && <Box component="span" sx={{ fontSize: '1.1rem', fontWeight: 600, ml: 0.5 }}>{unit}</Box>}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 22 }}>
          {typeof trendPercent === 'number' && (
            <Chip
              label={`${trendPercent >= 0 ? '↑' : '↓'} ${Math.abs(trendPercent)}%`}
              color={trendPercent >= 0 ? 'success' : 'error'}
              size="small"
              sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, borderRadius: 1.5 }}
            />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {sublabel}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const statusMeta = {
    live: { label: 'Live', color: theme.palette.success.main },
    connecting: { label: 'Syncing', color: theme.palette.warning.main },
    offline: { label: 'Offline', color: theme.palette.text.disabled },
    disabled: { label: 'Offline', color: theme.palette.text.disabled }
  }[realtimeStatus] || { label: 'Offline', color: theme.palette.text.disabled };

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 1.5, md: 3 }, maxWidth: 1500, mx: 'auto' }}>

      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: '-0.5px' }}>
              Dashboard
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.4, borderRadius: 2, bgcolor: 'action.selected' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusMeta.color }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>{statusMeta.label}</Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
            Stock health, movement trends, and per-saree demand forecasts.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {dateRange === 'custom' && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField type="date" size="small" value={customDates.start} onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })} sx={{ width: 150 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>to</Typography>
              <TextField type="date" size="small" value={customDates.end} onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })} sx={{ width: 150 }} />
            </Box>
          )}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="3months">Last 3 Months</MenuItem>
              <MenuItem value="6months">Last 6 Months</MenuItem>
              <MenuItem value="12months">Last 12 Months</MenuItem>
              <MenuItem value="custom">Custom Range</MenuItem>
            </Select>
          </FormControl>
          <IconButton
            onClick={() => {
              setLoading(true);
              fetchDashboardData();
              if (selectedSaree?.id) fetchPrediction(selectedSaree.id, forecastHorizon);
            }}
            color="primary"
            sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2.5, p: 1 }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* TABS */}
      <Tabs
        value={activeTab}
        onChange={(e, val) => setActiveTab(val)}
        sx={{ mb: 3, minHeight: 44, '& .MuiTab-root': { minHeight: 44, fontWeight: 800, fontSize: '0.95rem', textTransform: 'none', gap: 1 } }}
      >
        <Tab label="Overview" icon={<GridIcon sx={{ fontSize: '1.15rem' }} />} iconPosition="start" />
        <Tab label="Prediction" icon={<SparklesIcon sx={{ fontSize: '1.15rem' }} />} iconPosition="start" />
      </Tabs>

      {/* ══════════════════════ TAB 0: OVERVIEW ══════════════════════ */}
      {activeTab === 0 && (
        <Box>
          {/* KPI CARDS */}
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard label="Total Sarees" sublabel="Master catalog items" value={stats.totalSarees}
                icon={<SareeIcon />} tint={theme.palette.primary.main} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard label="Current Stock" sublabel="Total physical units" value={stats.currentStock.toLocaleString()} unit="pcs"
                icon={<GridIcon />} tint={theme.palette.secondary.main} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard label="Delivered" sublabel="vs prior period" value={stats.delivered.toLocaleString()} unit="pcs"
                icon={<DeliveryIcon />} tint={theme.palette.error.main} trendPercent={stats.comparison.deliveredPercent} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard label="Stock Added" sublabel="vs prior period" value={stats.added.toLocaleString()} unit="pcs"
                icon={<PurchaseIcon />} tint={theme.palette.success.main} trendPercent={stats.comparison.addedPercent} />
            </Grid>
          </Grid>

          {/* ALERT STRIP */}
          <Paper sx={{ ...glassCard, py: 1.75, px: 3, mb: 2.5 }} elevation={0}>
            <Grid container spacing={2} justifyContent="space-around" alignItems="center">
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { opacity: 0.75 } }} onClick={() => navigate('/low-stock')}>
                  <Box sx={{ bgcolor: 'rgba(245, 158, 11, 0.12)', p: 0.8, borderRadius: 1.5, display: 'flex' }}><WarningIcon color="warning" fontSize="small" /></Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.86rem' }}>Low Stock: <Box component="span" sx={{ color: 'warning.main', fontWeight: 900 }}>{stats.lowStock}</Box></Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { opacity: 0.75 } }} onClick={() => navigate('/sarees?status=out')}>
                  <Box sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', p: 0.8, borderRadius: 1.5, display: 'flex' }}><ErrorIcon color="error" fontSize="small" /></Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.86rem' }}>Out of Stock: <Box component="span" sx={{ color: 'error.main', fontWeight: 900 }}>{stats.outOfStock}</Box></Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { opacity: 0.75 } }} onClick={() => navigate('/stock-requests')}>
                  <Box sx={{ bgcolor: 'rgba(56, 189, 248, 0.12)', p: 0.8, borderRadius: 1.5, display: 'flex' }}><PendingIcon color="info" fontSize="small" /></Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.86rem' }}>Pending: <Box component="span" sx={{ color: 'info.main', fontWeight: 900 }}>{stats.pendingRequests}</Box></Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ bgcolor: 'rgba(192, 173, 141, 0.15)', p: 0.8, borderRadius: 1.5, display: 'flex' }}><DeliveryIcon color="secondary" fontSize="small" /></Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.86rem' }}>In Delivery: <Box component="span" sx={{ color: 'secondary.main', fontWeight: 900 }}>{stats.inDelivery}</Box></Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* STOCK MOVEMENT + HEALTH ANALYTICS */}
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ ...glassCard, p: 3, height: 400 }} elevation={0}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Stock In vs Stock Out</Typography>
                  <ButtonGroup size="small" variant="outlined" color="primary">
                    <Button variant={grouping === 'daily' ? 'contained' : 'outlined'} onClick={() => setGrouping('daily')}>Daily</Button>
                    <Button variant={grouping === 'weekly' ? 'contained' : 'outlined'} onClick={() => setGrouping('weekly')}>Weekly</Button>
                    <Button variant={grouping === 'monthly' ? 'contained' : 'outlined'} onClick={() => setGrouping('monthly')}>Monthly</Button>
                  </ButtonGroup>
                </Box>
                {loading ? (
                  <Skeleton variant="rectangular" height="75%" sx={{ borderRadius: 2 }} />
                ) : stockMovement.length === 0 ? (
                  <Box sx={{ height: '75%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary" sx={{ fontWeight: 600 }}>More stock movement history is needed to generate this trend.</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="82%">
                    <AreaChart data={stockMovement}>
                      <defs>
                        <linearGradient id="colorAddedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="colorDeliveredGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0.01} />
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

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ ...glassCard, p: 3, height: 400, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} elevation={0}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Health Analytics</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3, fontWeight: 600 }}>
                    Aggregated warehouse transaction metrics
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>Turnover Rate</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem', fontWeight: 500 }}>% of stock delivered</Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>{stockTurnover}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>Daily Outflow</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem', fontWeight: 500 }}>Avg volume shipped daily</Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 900 }}>{avgDailyDelivery} <Box component="span" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>pcs</Box></Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>Stock Cover</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem', fontWeight: 500 }}>Supply remaining duration</Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: stockDemandRatio < 15 ? 'warning.main' : 'success.main' }}>
                        {stockDemandRatio === 999 ? '∞' : `${stockDemandRatio}d`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Button variant="outlined" size="small" fullWidth endIcon={<ArrowForwardIcon />} onClick={() => navigate('/history')} sx={{ borderRadius: 2, py: 1, fontWeight: 700 }}>
                  View Full Audit History
                </Button>
              </Paper>
            </Grid>
          </Grid>

          {/* AI INVENTORY BRIEF */}
          {aiBrief.length > 0 && (
            <Paper sx={{ ...glassCard, p: 3, mb: 2.5 }} elevation={0}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <SparklesIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>AI Inventory Brief</Typography>
              </Box>
              <Grid container spacing={2}>
                {aiBrief.map((brief) => (
                  <Grid size={{ xs: 12, md: 6 }} key={brief.id}>
                    <Box sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2.25, borderRadius: 3,
                      border: `1px solid ${theme.palette.divider}`,
                      borderLeft: `4px solid ${brief.severity === 'warning' ? theme.palette.warning.main : brief.severity === 'success' ? theme.palette.success.main : theme.palette.primary.main}`,
                      height: '100%'
                    }}>
                      <Box sx={{ display: 'flex', gap: 1.75, alignItems: 'center' }}>
                        {brief.severity === 'warning' ? <WarningIcon color="warning" /> : brief.severity === 'success' ? <TrendingUpIcon color="success" /> : <InsightsIcon color="info" />}
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>{brief.title}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{brief.explanation}</Typography>
                        </Box>
                      </Box>
                      {brief.action && brief.route && (
                        <Button variant="text" color={brief.severity === 'warning' ? 'warning' : 'primary'} size="small" onClick={() => navigate(brief.route)} sx={{ flexShrink: 0, fontWeight: 700 }}>
                          {brief.action}
                        </Button>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* NEEDS ATTENTION + OPPORTUNITIES */}
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ ...glassCard, p: 3, minHeight: 320 }} elevation={0}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'error.main' }}>Needs Attention</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Risk</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {needsAttention.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
                            {item.name}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>{item.detail}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={item.type} color={item.severity === 'error' ? 'error' : item.severity === 'warning' ? 'warning' : 'info'} size="small" sx={{ fontSize: '0.63rem', fontWeight: 800 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="text" onClick={() => navigate(`/sarees/${item.sareeId}`)} sx={{ fontWeight: 700 }}>View</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {needsAttention.length === 0 && (
                        <TableRow><TableCell colSpan={3} align="center" sx={{ py: 5, color: 'text.secondary' }}>Nothing needs attention right now.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ ...glassCard, p: 3, minHeight: 320 }} elevation={0}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'success.main' }}>Opportunities</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Metric</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {opportunities.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
                            {item.name}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>{item.detail}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={item.type} color="success" variant="outlined" size="small" sx={{ fontSize: '0.63rem', fontWeight: 800 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="text" onClick={() => navigate(`/sarees/${item.sareeId}`)} sx={{ fontWeight: 700 }}>View</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {opportunities.length === 0 && (
                        <TableRow><TableCell colSpan={3} align="center" sx={{ py: 5, color: 'text.secondary' }}>No opportunities in this range.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* TOP PERFORMING + RECENT ACTIVITY */}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ ...glassCard, p: 3, minHeight: 360 }} elevation={0}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Top Performing Sarees</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Delivered</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Stock</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Trend</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Cover</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="center"> </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topPerforming.map((saree) => (
                        <TableRow key={saree.code} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{saree.code}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>{saree.delivered}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>{saree.stock}</TableCell>
                          <TableCell align="right">
                            <Chip label={`${saree.trend >= 0 ? '+' : ''}${saree.trend}%`} color={saree.trend >= 0 ? 'success' : 'error'} size="small" sx={{ fontWeight: 800, fontSize: '0.68rem' }} />
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={saree.daysRemaining === '∞' ? '∞' : `${saree.daysRemaining}d`} variant="outlined" color={saree.daysRemaining <= 15 ? 'warning' : 'primary'} size="small" sx={{ fontSize: '0.63rem', fontWeight: 800 }} />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="primary" onClick={async () => {
                              try {
                                const res = await sareeAPI.getAll({ search: saree.code });
                                const sObj = res.data.sarees?.find(s => s.series_code === saree.code);
                                if (sObj) navigate(`/sarees/${sObj.id}`);
                              } catch (e) { console.error(e); }
                            }}>
                              <ChevronRightIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {topPerforming.length === 0 && (
                        <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>No sales records in active period.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ ...glassCard, p: 3, minHeight: 360, display: 'flex', flexDirection: 'column' }} elevation={0}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Recent Activity</Typography>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 300 }}>
                  <List dense>
                    {recentActivity.map((activity, idx) => (
                      <Box key={activity.id}>
                        <ListItem alignItems="flex-start" sx={{ px: 1, py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 34, mt: 0.5 }}>
                            {activity.action === 'Increase' ? <PurchaseIcon color="success" fontSize="small" /> : activity.action === 'Decrease' ? <DeliveryIcon color="error" fontSize="small" /> : <SwapVertIcon color="info" fontSize="small" />}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{activity.actionLabel}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{new Date(activity.timestamp).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}</Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, fontWeight: 500 }}>
                                {activity.sareeCode} ({activity.combinationName}) • <Box component="span" sx={{ fontWeight: 800, color: activity.action === 'Increase' ? 'success.main' : 'error.main' }}>{activity.action === 'Increase' ? '+' : '-'}{activity.qty} pcs</Box> • {activity.user}
                              </Typography>
                            }
                          />
                        </ListItem>
                        {idx < recentActivity.length - 1 && <Divider component="li" />}
                      </Box>
                    ))}
                    {recentActivity.length === 0 && (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 5 }}>No recent stock activities found.</Typography>
                    )}
                  </List>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ══════════════════════ TAB 1: PREDICTION ══════════════════════ */}
      {activeTab === 1 && (
        <Box>
          <Paper sx={{ ...glassCard, p: 3, mb: 2.5 }} elevation={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Saree Demand Prediction</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  How much to stock for the selected saree — based on demand, volatility, and safety stock.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Autocomplete
                  size="small"
                  options={sareesList}
                  getOptionLabel={(option) => `${option.series_code} (${option.sari_name || 'Unnamed'})`}
                  value={selectedSaree}
                  onChange={(event, newValue) => setSelectedSaree(newValue)}
                  renderInput={(params) => <TextField {...params} label="Select Saree" />}
                  sx={{ width: 240 }}
                />
                <ButtonGroup size="small" variant="outlined" color="primary">
                  {[7, 15, 30, 60, 90].map((h) => (
                    <Button key={h} variant={forecastHorizon === h ? 'contained' : 'outlined'} onClick={() => setForecastHorizon(h)} sx={{ px: 1.5 }}>{h}d</Button>
                  ))}
                </ButtonGroup>
              </Box>
            </Box>

            {loadingPrediction ? (
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 4 }}><Skeleton variant="rectangular" height={340} sx={{ borderRadius: 3 }} /></Grid>
                <Grid size={{ xs: 12, md: 8 }}><Skeleton variant="rectangular" height={340} sx={{ borderRadius: 3 }} /></Grid>
              </Grid>
            ) : !predictionData ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary" sx={{ fontWeight: 650 }}>Select a saree to generate its forecast.</Typography>
              </Box>
            ) : (
              <Grid container spacing={2.5}>
                {/* HEADLINE RECOMMENDATION + METRICS */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3.5, height: '100%', bgcolor: 'transparent', borderColor: theme.palette.divider, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.8px' }}>
                      {predictionData.saree?.seriesCode} · {forecastHorizon}-day outlook
                    </Typography>

                    {/* The plain-language headline the user asked for */}
                    <Box sx={{ my: 2, p: 2.25, borderRadius: 3, bgcolor: predictionData.forecast?.recommendedOrderQty > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)', border: `1px solid ${predictionData.forecast?.recommendedOrderQty > 0 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(34, 197, 94, 0.25)'}` }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: predictionData.forecast?.recommendedOrderQty > 0 ? 'warning.main' : 'success.main' }}>
                        {predictionData.forecast?.recommendedOrderQty > 0 ? 'Recommended order' : 'Stock is healthy'}
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.5px', color: predictionData.forecast?.recommendedOrderQty > 0 ? 'warning.main' : 'success.main', mt: 0.5 }}>
                        {predictionData.forecast?.recommendedOrderQty > 0 ? `+${predictionData.forecast.recommendedOrderQty} pcs` : 'No order needed'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {predictionData.forecast?.recommendedOrderQty > 0
                          ? `Covers ${forecastHorizon}-day demand + safety stock`
                          : `Current stock covers the ${forecastHorizon}-day horizon`}
                      </Typography>
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
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
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Days of Cover</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{predictionData.forecast?.daysRemaining}</Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 'auto', pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Forecast Confidence</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>{predictionData.forecast?.confidence}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={predictionData.forecast?.confidence} sx={{ height: 6, borderRadius: 3 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, alignItems: 'center' }}>
                        <Chip
                          label={`Risk: ${predictionData.forecast?.stockoutRisk}`}
                          color={predictionData.forecast?.stockoutRisk === 'CRITICAL' || predictionData.forecast?.stockoutRisk === 'HIGH' ? 'error' : predictionData.forecast?.stockoutRisk === 'MODERATE' ? 'warning' : 'success'}
                          size="small" sx={{ fontWeight: 800 }}
                        />
                        <Chip label={`Data: ${predictionData.forecast?.dataQuality}`} variant="outlined" size="small" sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                      </Box>
                      {predictionData.forecast?.recommendedOrderQty > 0 && (
                        <Button variant="contained" color="warning" size="small" fullWidth onClick={() => navigate(`/sarees/${predictionData.saree?.id}`)} sx={{ py: 1, mt: 2, borderRadius: 2, fontWeight: 700 }}>
                          Initiate Stock Request
                        </Button>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* CHART + AI NARRATIVE */}
                <Grid size={{ xs: 12, md: 8 }}>
                  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3.5, bgcolor: 'transparent', borderColor: theme.palette.divider }}>
                      <ResponsiveContainer width="100%" height={190}>
                        <AreaChart data={predictionData.chartPoints}>
                          <defs>
                            <linearGradient id="predictedSareeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.01} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                          <XAxis dataKey="label" stroke={theme.palette.text.secondary} fontSize={10} tickLine={false} />
                          <YAxis stroke={theme.palette.text.secondary} fontSize={10} tickLine={false} />
                          <RechartsTooltip contentStyle={tooltipStyle} />
                          <ReferenceLine x={predictionData.chartPoints?.[29]?.label} stroke={theme.palette.primary.main} strokeDasharray="5 5" label={{ value: 'Today', position: 'top', fill: theme.palette.text.secondary, fontSize: 10, fontWeight: 700 }} />
                          <Area type="monotone" dataKey="historical" name="Historical Deliveries" stroke={theme.palette.primary.main} fill="url(#predictedSareeGrad)" strokeWidth={2} />
                          <Area type="monotone" dataKey="forecast" name="Forecast Demand" stroke={theme.palette.secondary.main} strokeDasharray="5 5" fill="none" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3.5, bgcolor: 'transparent', borderColor: theme.palette.divider, flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <SparklesIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>AI Assessment</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.5 }}>
                        "{predictionData.aiAnalysis?.summary || 'AI explanation temporarily unavailable.'}"
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.8, color: 'error.main', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risks</Typography>
                          {predictionData.aiAnalysis?.risks?.length ? predictionData.aiAnalysis.risks.map((risk, idx) => (
                            <Typography key={idx} variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 500, mb: 0.4 }}>• {risk}</Typography>
                          )) : <Typography variant="caption" color="text.secondary">• No operational risk detected.</Typography>}
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.8, color: 'success.main', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</Typography>
                          {predictionData.aiAnalysis?.actions?.length ? predictionData.aiAnalysis.actions.map((act, idx) => (
                            <Typography key={idx} variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 500, mb: 0.4 }}>• {act}</Typography>
                          )) : <Typography variant="caption" color="text.secondary">• Stock levels optimal.</Typography>}
                        </Grid>
                      </Grid>
                    </Paper>
                  </Box>
                </Grid>

                {/* HIERARCHICAL BREAKDOWN */}
                <Grid size={12}>
                  <Button
                    variant="outlined" size="small"
                    startIcon={showPredictionBreakdown ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={() => setShowPredictionBreakdown(!showPredictionBreakdown)}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    {showPredictionBreakdown ? 'Hide breakdown' : 'Beam → Combination breakdown'}
                  </Button>
                  <Collapse in={showPredictionBreakdown} sx={{ mt: 2 }}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3.5, bgcolor: 'transparent', borderColor: theme.palette.divider }}>
                      {(predictionData.beamsBreakdown || []).map((beam) => (
                        <Box key={beam.id} sx={{ mb: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, pb: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', py: 0.5 }} onClick={() => setExpandedBeam(expandedBeam === beam.id ? null : beam.id)}>
                            <Typography variant="body2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                              {expandedBeam === beam.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                              {beam.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                              Stock: {beam.currentStock} | Forecast: {beam.forecastDemand} | Rec: <Box component="span" sx={{ fontWeight: 800, color: beam.recommendedOrderQty > 0 ? 'warning.main' : 'text.secondary' }}>+{beam.recommendedOrderQty}</Box>
                            </Typography>
                          </Box>
                          <Collapse in={expandedBeam === beam.id}>
                            <List dense sx={{ pl: 3.5, mt: 1 }}>
                              {(beam.combinations || []).map((combo) => (
                                <ListItem key={combo.id} sx={{ py: 0.5, borderLeft: `1px dashed ${theme.palette.divider}` }}>
                                  <ListItemText primary={
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2, gap: 1, flexWrap: 'wrap' }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {combo.name}
                                        <Chip label={combo.brand || 'KP'} size="small" sx={{ height: 16, fontSize: '0.56rem', fontWeight: 800 }} />
                                        <Chip label={combo.status || 'In Stock'} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.56rem', fontWeight: 800 }} />
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        Stock: {combo.currentStock} | Forecast: {combo.forecastDemand} | Rec: <Box component="span" sx={{ fontWeight: 800, color: combo.recommendedOrderQty > 0 ? 'warning.main' : 'success.main' }}>+{combo.recommendedOrderQty}</Box>
                                      </Typography>
                                    </Box>
                                  } />
                                </ListItem>
                              ))}
                            </List>
                          </Collapse>
                        </Box>
                      ))}
                    </Paper>
                  </Collapse>
                </Grid>
              </Grid>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2.5, textAlign: 'center', fontStyle: 'italic', fontWeight: 500 }}>
              Forecasts are estimates based on historical stock movement and recent demand patterns.
            </Typography>
          </Paper>
        </Box>
      )}

    </Box>
  );
};

export default Dashboard;
