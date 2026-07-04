import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import {
  Grid, Paper, Box, Typography, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableRow,
  Button, useTheme, Skeleton, Chip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  WarningAmber as WarningIcon,
  Checkroom as SareeIcon,
  GridOn as GridIcon,
  ShoppingCart as PurchaseIcon,
  LocalShipping as DeliveryIcon,
  Schedule as PendingIcon,
  Bolt as InsightsIcon
} from '@mui/icons-material';
import ErrorIcon from '@mui/icons-material/Error';
import CompletedIcon from '@mui/icons-material/CheckCircle';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { CHART_COLORS } from '../theme/theme';

const COLORS = CHART_COLORS;

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardAPI.get();
      setData(response.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Shared chart tooltip styling (theme-aware)
  const tooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    color: theme.palette.text.primary,
    fontSize: 12,
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h3" sx={{ mb: 4 }}><Skeleton width={300} /></Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 3, mb: 3 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  const stats = data?.stats || {
    totalSarees: 0, totalStock: 0, todayDeliveries: 0, todayPurchases: 0,
    lowStockCount: 0, outOfStock: 0, pendingRequests: 0, completedRequests: 0
  };
  const charts = data?.charts || {
    monthlyComparison: [], topSellingSarees: [], topPurchasedSarees: [],
    topSuppliers: [], topCustomers: [], mostRequested: [], leastRequested: [],
    lowStockTrend: []
  };
  const widgets = data?.widgets || {
    highestStockItem: null, lowestStockItem: null, monthlyGrowthPercent: 0,
    yesterdayPurchases: 0, yesterdayDeliveries: 0
  };
  const aiInsights = data?.aiInsights || [];

  const cardsList = [
    { title: 'Total Sarees', value: stats.totalSarees, icon: <SareeIcon />, color: '#A16D47', subtitle: 'Master catalog series' },
    { title: 'Warehouse Stock', value: `${stats.totalStock} pcs`, icon: <GridIcon />, color: '#C0AD8D', subtitle: 'Current physical pieces' },
    { title: "Today's Deliveries", value: `${stats.todayDeliveries} pcs`, icon: <DeliveryIcon />, color: '#EF4444', subtitle: `Yesterday: ${widgets.yesterdayDeliveries} pcs` },
    { title: "Today's Purchases", value: `${stats.todayPurchases} pcs`, icon: <PurchaseIcon />, color: '#22C55E', subtitle: `Yesterday: ${widgets.yesterdayPurchases} pcs` },
    { title: 'Low Stock Alerts', value: stats.lowStockCount, icon: <WarningIcon />, color: '#F59E0B', click: '/low-stock', subtitle: 'Items under safety stock limit' },
    { title: 'Out of Stock Items', value: stats.outOfStock, icon: <ErrorIcon />, color: '#DC2626', click: '/sarees?status=out', subtitle: 'Zero availability products' },
    { title: 'Pending Requests', value: stats.pendingRequests, icon: <PendingIcon />, color: '#38BDF8', click: '/stock-requests', subtitle: 'Awaiting supplier confirmation' },
    { title: 'Completed Requests', value: stats.completedRequests, icon: <CompletedIcon />, color: '#16A34A', click: '/stock-requests', subtitle: 'Fulfilled stock request history' }
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 1 }}>
      {/* Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: '1.8rem', fontWeight: 800, color: 'text.primary', letterSpacing: '-0.5px' }}>
            Inventory Control Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enterprise resource tracking and predictive stock analytics
          </Typography>
        </Box>
      </Box>

      {/* AI Assistant Widgets */}
      {aiInsights.length > 0 && (
        <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #C0AD8D 0%, #A16D47 55%, #776F4F 100%)', color: '#fff', borderRadius: 3, border: 'none', boxShadow: '0 8px 28px rgba(161,109,71,0.35)', '&:hover': { transform: 'none' } }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <InsightsIcon color="inherit" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '0.2px', color: '#fff' }}>
                AI Inventory Insights & Forecasts
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {aiInsights.map((insight, idx) => (
                <Grid size={{ xs: 12, md: 6 }} key={idx}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255,255,255,0.15)', p: 1.5, borderRadius: 2.5 }}>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: insight }} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {cardsList.map((c, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <Card
              onClick={() => c.click && navigate(c.click)}
              sx={{
                cursor: c.click ? 'pointer' : 'default',
                bgcolor: 'background.paper',
                borderLeft: `4px solid ${c.color}`,
                borderRadius: 2.5,
                height: '100%',
                '&:hover': c.click ? {
                  transform: 'translateY(-4px)',
                } : { transform: 'none' }
              }}
            >
              <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 110, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {c.title}
                  </Typography>
                  <Box sx={{ color: c.color, bgcolor: `${c.color}1A`, p: 0.8, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.icon}
                  </Box>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 850, color: 'text.primary', mb: 0.2, letterSpacing: '-0.5px' }}>
                    {c.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.subtitle}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Row 1 Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Main Comparison Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 390, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 800, color: 'text.primary' }}>
              Stock Inflow (Purchases) vs Outflow (Deliveries)
            </Typography>
            <ResponsiveContainer width="100%" height="86%">
              <AreaChart data={charts.monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                <XAxis dataKey="label" stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="stockIn" name="Stock Added" stroke="#22C55E" strokeWidth={2.5} fillOpacity={0.1} fill="#22C55E" />
                <Area type="monotone" dataKey="stockOut" name="Stock Delivered" stroke="#EF4444" strokeWidth={2.5} fillOpacity={0.1} fill="#EF4444" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Low Stock Trend Chart */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 390, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 800, color: 'text.primary' }}>
              Low Stock Warnings Trend
            </Typography>
            <ResponsiveContainer width="100%" height="86%">
              <LineChart data={charts.lowStockTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                <XAxis dataKey="label" stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" name="Low Stock Count" stroke="#A16D47" strokeWidth={3} activeDot={{ r: 8 }} dot={{ strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Row 2 Top Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Top Selling and Purchased */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 360, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 800, color: 'text.primary' }}>
              Top Selling vs Top Purchased Sarees
            </Typography>
            <ResponsiveContainer width="100%" height="82%">
              <BarChart data={charts.topSellingSarees}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} />
                <YAxis stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} />
                <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: theme.palette.action.hover }} />
                <Bar dataKey="value" name="Pieces Sold" fill="#A16D47" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Suppliers */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 360, display: 'flex', flexDirection: 'column', border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800, color: 'text.primary' }}>
              Top Suppliers
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.topSuppliers}
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {charts.topSuppliers.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Top Customers */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 360, display: 'flex', flexDirection: 'column', border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800, color: 'text.primary' }}>
              Top Customers
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.topCustomers}
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {charts.topCustomers.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[(idx + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Row 3 Widget Details */}
      <Grid container spacing={3}>
        {/* Highest and Lowest Stock Widgets */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, minHeight: 220, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, color: 'text.primary' }}>
              Warehouse Extremes & Growth
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Highest Stock Item</TableCell>
                    <TableCell sx={{ py: 1.5 }}>{widgets.highestStockItem?.name || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main', py: 1.5 }}>
                      {widgets.highestStockItem ? `${widgets.highestStockItem.stock} pcs` : '-'}
                    </TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Lowest Stock Item</TableCell>
                    <TableCell sx={{ py: 1.5 }}>{widgets.lowestStockItem?.name || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main', py: 1.5 }}>
                      {widgets.lowestStockItem ? `${widgets.lowestStockItem.stock} pcs` : '-'}
                    </TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Monthly Growth %</TableCell>
                    <TableCell sx={{ py: 1.5 }}>Overall incoming inventory expansion</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: widgets.monthlyGrowthPercent >= 0 ? 'success.main' : 'error.main', py: 1.5 }}>
                      {widgets.monthlyGrowthPercent >= 0 ? `+${widgets.monthlyGrowthPercent}%` : `${widgets.monthlyGrowthPercent}%`}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Most and Least Requested */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, minHeight: 220, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 800, color: 'text.primary' }}>
              Most Requested Sarees (WhatsApp Requests)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {charts.mostRequested.map((req, idx) => (
                <Chip
                  key={idx}
                  icon={<SareeIcon />}
                  label={`${req.name}: ${req.value} requested`}
                  color="primary"
                  variant="outlined"
                  sx={{ p: 1.8, borderRadius: 2.5, fontWeight: 600 }}
                />
              ))}
              {charts.mostRequested.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No stock request records found.</Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
