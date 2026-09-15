/**
 * Dashboard Component — Redesigned with shadcn/ui & Tailwind CSS
 * Editorial Luxury Executive Analytics Dashboard
 * Features:
 * - High-impact KPI stat cards with trend percentage indicators
 * - Recharts Stock In vs Stock Out visual telemetry
 * - Interactive AI Demand Prediction engine with multi-day forecasting
 * - Real-time inventory status sync via Supabase
 * - Direct actionable stock replenishment triggers
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, sareeAPI } from '../services/api';
import { supabase } from '../services/supabase';
import { useDebouncedCallback } from '../hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/table';
import { cn } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend, AreaChart, Area, ReferenceLine
} from 'recharts';
import RequestStockDialog from '../components/common/RequestStockDialog';
import {
  LayoutDashboard,
  Shirt,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Package,
  Truck,
  Clock,
  RotateCcw,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Layers,
  Zap
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

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

  // Request Stock Dialog States
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [selectedBeamName, setSelectedBeamName] = useState('');
  const [selectedSeriesCode, setSelectedSeriesCode] = useState('');
  const [selectedSareeId, setSelectedSareeId] = useState('');
  const [requestMovementType, setRequestMovementType] = useState('STOCK_IN');

  const handleActionableRequestStock = async (item) => {
    try {
      if (!item.sareeId || !item.id) return;
      const res = await sareeAPI.getById(item.sareeId);
      const saree = res.data.saree;

      let matchedBeam = null;
      let matchedCombo = null;
      for (const b of saree.beams || []) {
        for (const c of b.combinations || []) {
          if (c.id === item.id) {
            matchedBeam = b;
            matchedCombo = c;
            break;
          }
        }
      }

      if (matchedCombo) {
        setSelectedCombo(matchedCombo);
        setSelectedBeamName(matchedBeam?.beam_name || 'Beam');
        setSelectedSeriesCode(saree.series_code || 'Saree');
        setSelectedSareeId(saree.id);
        setRequestMovementType(item.type === 'Out of Stock' || item.type === 'Low Stock' ? 'STOCK_IN' : 'DELIVERY_OUT');
        setRequestDialogOpen(true);
      }
    } catch (err) {
      console.error('Failed to trigger stock request from card:', err);
    }
  };

  // Fetch Dashboard Stats
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
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

  // Debounced realtime callback
  const handleRealtimeUpdate = useDebouncedCallback(() => {
    fetchDashboardData();
    if (selectedSaree?.id) {
      fetchPrediction(selectedSaree.id, forecastHorizon);
    }
  }, 300);

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
        handleRealtimeUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combinations' }, () => {
        handleRealtimeUpdate();
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
  }, [handleRealtimeUpdate]);

  // Tooltip theme
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))',
    fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
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

  const activeDays = dateRange === 'today' ? 1 : (dateRange === '7days' ? 7 : (dateRange === '30days' ? 30 : (dateRange === '3months' ? 90 : (dateRange === '6months' ? 180 : (dateRange === '12months' ? 365 : 30)))));
  const avgDailyDelivery = Math.round((stats.delivered / activeDays) * 10) / 10;
  const stockTurnover = stats.currentStock > 0 ? Math.round((stats.delivered / stats.currentStock) * 1000) / 10 : 0;
  const stockDemandRatio = avgDailyDelivery > 0 ? Math.round((stats.currentStock / avgDailyDelivery) * 10) / 10 : 999;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 border border-border text-[11px] font-semibold">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  realtimeStatus === 'live'
                    ? "bg-emerald-500 animate-pulse"
                    : realtimeStatus === 'connecting'
                    ? "bg-amber-500"
                    : "bg-muted-foreground/50"
                )}
              />
              <span className="capitalize text-muted-foreground">
                {realtimeStatus}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise overview of live warehouse inventory, distribution analytics, and AI forecasts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={customDates.start}
                onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                className="h-9 px-2 rounded-lg border border-input bg-background text-xs"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customDates.end}
                onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                className="h-9 px-2 rounded-lg border border-input bg-background text-xs"
              />
            </div>
          )}

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
            <option value="custom">Custom Range</option>
          </select>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => {
              setLoading(true);
              fetchDashboardData();
              if (selectedSaree?.id) fetchPrediction(selectedSaree.id, forecastHorizon);
            }}
            title="Refresh Metrics"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-burgundy-900")} />
          </Button>
        </div>
      </div>

      {/* Mode Tabs: Overview vs Prediction */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab(0)}
          className={cn(
            "flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-all",
            activeTab === 0
              ? "border-burgundy-900 text-burgundy-900 dark:border-burgundy-300 dark:text-burgundy-300"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Operational Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(1)}
          className={cn(
            "flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-all",
            activeTab === 1
              ? "border-burgundy-900 text-burgundy-900 dark:border-burgundy-300 dark:text-burgundy-300"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>AI Demand Forecast</span>
        </button>
      </div>

      {/* ══════════════════════ TAB 0: OPERATIONAL OVERVIEW ══════════════════════ */}
      {activeTab === 0 && (
        <div className="space-y-6">
          {/* KPI Cards (4 grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sarees */}
            <Card className="border border-border shadow-luxury hover:shadow-luxury-hover transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Catalog Items
                  </span>
                  <div className="p-2 rounded-xl bg-burgundy-900/10 text-burgundy-900 dark:text-burgundy-300">
                    <Shirt className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground">
                    {(stats.totalSarees ?? 0).toLocaleString()}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Master saree designs registered
                </span>
              </CardContent>
            </Card>

            {/* Current Stock */}
            <Card className="border border-border shadow-luxury hover:shadow-luxury-hover transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Available Stock
                  </span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground">
                    {(stats.currentStock ?? 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">pcs</span>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Physical warehouse volume
                </span>
              </CardContent>
            </Card>

            {/* Delivery Out */}
            <Card className="border border-border shadow-luxury hover:shadow-luxury-hover transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Dispatched Out
                  </span>
                  <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground">
                    {(stats.delivered ?? 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">pcs</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {typeof stats?.comparison?.deliveredPercent === 'number' && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5",
                        stats.comparison.deliveredPercent >= 0
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {stats.comparison.deliveredPercent >= 0 ? '+' : ''}
                      {stats.comparison.deliveredPercent}%
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">vs prior range</span>
                </div>
              </CardContent>
            </Card>

            {/* Stock In */}
            <Card className="border border-border shadow-luxury hover:shadow-luxury-hover transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Replenished In
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground">
                    {(stats.added ?? 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">pcs</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {typeof stats?.comparison?.addedPercent === 'number' && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5",
                        stats.comparison.addedPercent >= 0
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {stats.comparison.addedPercent >= 0 ? '+' : ''}
                      {stats.comparison.addedPercent}%
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">vs prior range</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert and Status Bar Strip */}
          <Card className="border border-border shadow-xs bg-card">
            <CardContent className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-4 flex-wrap text-xs">
                {/* Low Stock pill */}
                <button
                  type="button"
                  onClick={() => navigate('/low-stock')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-muted-foreground">
                    Low Stock: <strong className="text-amber-600 font-bold">{stats.lowStock}</strong>
                  </span>
                </button>

                <div className="h-4 w-px bg-border hidden sm:block" />

                {/* Out of stock */}
                <button
                  type="button"
                  onClick={() => navigate('/sarees?status=out')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="p-1.5 rounded-md bg-destructive/10 text-destructive">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-muted-foreground">
                    Depleted: <strong className="text-destructive font-bold">{stats.outOfStock}</strong>
                  </span>
                </button>

                <div className="h-4 w-px bg-border hidden sm:block" />

                {/* Pending requests */}
                <button
                  type="button"
                  onClick={() => navigate('/stock-requests')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-muted-foreground">
                    Pending Orders: <strong className="text-blue-600 font-bold">{stats.pendingRequests}</strong>
                  </span>
                </button>

                <div className="h-4 w-px bg-border hidden sm:block" />

                {/* Rollbacks */}
                <button
                  type="button"
                  onClick={() => navigate('/history?action=Rollback')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-muted-foreground">
                    Rollbacks Today: <strong className="text-purple-600 font-bold">{stats.todayRollbacks || 0}</strong>
                  </span>
                </button>
              </div>

              <Button
                variant="luxury"
                size="sm"
                onClick={() => navigate('/stock-requests')}
                className="text-xs font-bold h-8 px-3 shadow-xs shrink-0"
              >
                + New Stock Request
              </Button>
            </CardContent>
          </Card>

          {/* Charts Row: Stock Movement & Health Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Bar Chart */}
            <Card className="lg:col-span-8 border border-border shadow-luxury">
              <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Inventory Flow Telemetry</CardTitle>
                  <CardDescription className="text-xs">
                    Comparative timeline of additions vs customer dispatches
                  </CardDescription>
                </div>

                <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/30">
                  {['daily', 'weekly', 'monthly'].map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setGrouping(grp)}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-bold rounded-md capitalize transition-colors",
                        grouping === grp
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {grp}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-2">
                {stockMovement.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-xs text-muted-foreground">
                    No movement records registered for this interval.
                  </div>
                ) : (
                  <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockMovement} barGap={2} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip contentStyle={tooltipStyle} />
                        <Legend verticalAlign="top" height={32} iconType="circle" />
                        <Bar
                          dataKey="stockAdded"
                          name="Stock In"
                          fill="#22C55E"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="stockDelivered"
                          name="Dispatched"
                          fill="#EF4444"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Health Analytics Card */}
            <Card className="lg:col-span-4 border border-border shadow-luxury flex flex-col justify-between">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-base">Efficiency & Run-Rate</CardTitle>
                <CardDescription className="text-xs">
                  Inventory turnover velocity & safety runway
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Turnover Velocity
                    </span>
                    <span className="text-xs text-muted-foreground">
                      % stock cleared in period
                    </span>
                  </div>
                  <span className="font-mono text-2xl font-bold text-burgundy-900 dark:text-burgundy-300">
                    {stockTurnover}%
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Average Outflow
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Mean daily pieces dispatched
                    </span>
                  </div>
                  <span className="font-mono text-2xl font-bold text-foreground">
                    {avgDailyDelivery} <span className="text-xs font-normal">pcs</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Stock Runway
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Duration until depletion
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-2xl font-bold",
                      stockDemandRatio < 15 ? "text-amber-600" : "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {stockDemandRatio === 999 ? '∞' : `${stockDemandRatio}d`}
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-xs font-bold h-9 mt-4"
                  onClick={() => navigate('/history')}
                >
                  Inspect Full Audit Ledger
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* AI Banner Shortcut to Prediction Tab */}
          {selectedSaree && (
            <div
              onClick={() => setActiveTab(1)}
              className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-800 text-white shadow-luxury cursor-pointer hover:shadow-luxury-hover transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs uppercase tracking-widest text-amber-200 font-bold block">
                    Predictive Intelligence Available
                  </span>
                  <span className="text-sm font-semibold text-white group-hover:underline">
                    Analyze future run-rates for {selectedSaree.series_code} ({selectedSaree.sari_name || 'Design'}) &rarr;
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-200 group-hover:translate-x-1 transition-transform" />
            </div>
          )}

          {/* Needs Attention vs Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Needs Attention */}
            <Card className="border border-border shadow-luxury">
              <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Needs Attention
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Depleted combinations requiring replenishment
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/low-stock')}
                  className="text-xs font-bold"
                >
                  View All
                </Button>
              </CardHeader>

              <CardContent className="p-5 pt-3 space-y-2.5">
                {needsAttention.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Zero items currently require emergency replenishment.
                  </div>
                ) : (
                  needsAttention.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 hover:border-destructive/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs shrink-0">
                            🧵
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground truncate">
                              {item.name}
                            </span>
                            <Badge variant="danger" className="text-[9px] px-1.5 py-0">
                              {item.type}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {item.detail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const code = item.name?.split(' - ')[0];
                            navigate(`/sarees?search=${encodeURIComponent(code || '')}&expandSareeId=${item.sareeId}&highlightComboId=${item.id}`);
                          }}
                          className="h-7 px-2 text-[11px] font-bold"
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleActionableRequestStock(item)}
                          className="h-7 px-2 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Stock
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Opportunities */}
            <Card className="border border-border shadow-luxury">
              <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Demand Opportunities
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Fast-moving sarees trending with buyers
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/sarees')}
                  className="text-xs font-bold"
                >
                  View Catalog
                </Button>
              </CardHeader>

              <CardContent className="p-5 pt-3 space-y-2.5">
                {opportunities.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No velocity surges detected in current window.
                  </div>
                ) : (
                  opportunities.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs shrink-0">
                            ✨
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground truncate">
                              {item.name}
                            </span>
                            <Badge variant="success" className="text-[9px] px-1.5 py-0">
                              {item.type}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {item.detail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const code = item.name?.split(' - ')[0];
                            navigate(`/sarees?search=${encodeURIComponent(code || '')}&expandSareeId=${item.sareeId}&highlightComboId=${item.id}`);
                          }}
                          className="h-7 px-2 text-[11px] font-bold"
                        >
                          Forecast
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleActionableRequestStock(item)}
                          className="h-7 px-2 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Deliver
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Table & Recent Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Performing Table */}
            <Card className="lg:col-span-7 border border-border shadow-luxury">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-base">Top Performing Series</CardTitle>
                <CardDescription className="text-xs">
                  Highest volume dispatch items with stock runway
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Series Code</TableHead>
                        <TableHead className="text-xs font-bold text-right">Delivered</TableHead>
                        <TableHead className="text-xs font-bold text-right">In Stock</TableHead>
                        <TableHead className="text-xs font-bold text-right">Trend</TableHead>
                        <TableHead className="text-xs font-bold text-right">Runway</TableHead>
                        <TableHead className="text-xs font-bold text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPerforming.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                            No dispatch volume registered for this timeframe.
                          </TableCell>
                        </TableRow>
                      ) : (
                        topPerforming.map((saree) => (
                          <TableRow key={saree.code} className="hover:bg-muted/40">
                            <TableCell className="font-mono text-xs font-bold py-3 text-foreground">
                              {saree.code}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold py-3 text-foreground">
                              {saree.delivered}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs py-3 text-muted-foreground">
                              {saree.stock}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <Badge
                                variant={saree.trend >= 0 ? "success" : "danger"}
                                className="text-[10px] font-bold px-1.5 py-0 font-mono"
                              >
                                {saree.trend >= 0 ? '+' : ''}{saree.trend}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <span
                                className={cn(
                                  "font-mono text-xs font-bold px-1.5 py-0.5 rounded-sm",
                                  saree.daysRemaining <= 15
                                    ? "bg-amber-500/10 text-amber-600"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {saree.daysRemaining === '∞' ? '∞' : `${saree.daysRemaining}d`}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-3 pr-4">
                              <button
                                type="button"
                                onClick={() => navigate(`/sarees?search=${encodeURIComponent(saree.code)}`)}
                                className="p-1 rounded-md text-muted-foreground hover:text-burgundy-900 dark:hover:text-burgundy-300 transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity List */}
            <Card className="lg:col-span-5 border border-border shadow-luxury">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-base">Recent Ledger Operations</CardTitle>
                <CardDescription className="text-xs">
                  Live feed of latest inventory updates
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-2">
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {recentActivity.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No recent activities logged.
                    </div>
                  ) : (
                    recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 pb-2.5 border-b border-border/60 last:border-0"
                      >
                        <div
                          className={cn(
                            "p-1.5 rounded-lg shrink-0 mt-0.5",
                            activity.action === 'Increase'
                              ? "bg-emerald-500/10 text-emerald-600"
                              : activity.action === 'Decrease'
                              ? "bg-destructive/10 text-destructive"
                              : "bg-blue-500/10 text-blue-600"
                          )}
                        >
                          {activity.action === 'Increase' ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : activity.action === 'Decrease' ? (
                            <Truck className="w-3.5 h-3.5" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-foreground truncate">
                              {activity.actionLabel}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                              {new Date(activity.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {activity.sareeCode} ({activity.combinationName}) &bull;{' '}
                            <strong
                              className={
                                activity.action === 'Increase'
                                  ? "text-emerald-600 font-mono"
                                  : "text-destructive font-mono"
                              }
                            >
                              {activity.action === 'Increase' ? '+' : '-'}{activity.qty} pcs
                            </strong>{' '}
                            by {activity.user}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════ TAB 1: AI PREDICTION ENGINE ══════════════════════ */}
      {activeTab === 1 && (
        <div className="space-y-6">
          <Card className="border border-border shadow-luxury">
            <CardHeader className="p-6 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-lg">Predictive Saree Demand Engine</CardTitle>
                </div>
                <CardDescription className="text-xs mt-1">
                  AI-powered replenishment requirements factoring velocity and safe runway
                </CardDescription>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Saree Selector Dropdown */}
                <select
                  value={selectedSaree?.id || ''}
                  onChange={(e) => {
                    const match = sareesList.find((s) => s.id === e.target.value);
                    if (match) setSelectedSaree(match);
                  }}
                  className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring min-w-[200px]"
                >
                  {sareesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.series_code} ({s.sari_name || 'Design'})
                    </option>
                  ))}
                </select>

                {/* Horizon Buttons */}
                <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
                  {[7, 15, 30, 60, 90].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setForecastHorizon(h)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-md transition-colors",
                        forecastHorizon === h
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {h}d
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {loadingPrediction && !predictionData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Skeleton className="h-80 w-full rounded-2xl" />
                  <Skeleton className="md:col-span-2 h-80 w-full rounded-2xl" />
                </div>
              ) : !predictionData ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Select a registered saree to evaluate its AI demand forecast.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Recommendation Card */}
                    <div className="lg:col-span-4 p-5 rounded-2xl border border-border bg-muted/20 space-y-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                          {predictionData.saree?.seriesCode} &bull; {forecastHorizon}-Day Forecast
                        </span>

                        <div
                          className={cn(
                            "p-4 rounded-xl border mt-3 space-y-1",
                            predictionData.forecast?.recommendedOrderQty > 0
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                          )}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider block">
                            {predictionData.forecast?.recommendedOrderQty > 0
                              ? "Replenishment Recommended"
                              : "Inventory Healthy"}
                          </span>
                          <span className="text-2xl font-bold font-mono block">
                            {predictionData.forecast?.recommendedOrderQty > 0
                              ? `+${predictionData.forecast.recommendedOrderQty} pcs`
                              : "Optimal Levels"}
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            {predictionData.forecast?.recommendedOrderQty > 0
                              ? `Covers expected ${forecastHorizon}-day demand buffer`
                              : `Sufficient runway for the full ${forecastHorizon}-day window`}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Current Stock
                            </span>
                            <span className="font-mono text-base font-bold text-foreground">
                              {predictionData.forecast?.currentStock} pcs
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Daily Run-Rate
                            </span>
                            <span className="font-mono text-base font-bold text-foreground">
                              {predictionData.forecast?.avgDailyDemand} pcs
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Horizon Demand
                            </span>
                            <span className="font-mono text-base font-bold text-foreground">
                              {predictionData.forecast?.forecastDemand} pcs
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Cover Remaining
                            </span>
                            <span className="font-mono text-base font-bold text-foreground">
                              {predictionData.forecast?.daysRemaining}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/80 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Forecast Reliability</span>
                          <span className="font-mono font-bold text-foreground">
                            {predictionData.forecast?.confidence}%
                          </span>
                        </div>
                        <Progress value={predictionData.forecast?.confidence} className="h-2" />

                        {predictionData.forecast?.recommendedOrderQty > 0 && (
                          <Button
                            variant="luxury"
                            className="w-full text-xs font-bold mt-2"
                            onClick={() => navigate(`/sarees/${predictionData.saree?.id}`)}
                          >
                            Open Saree Procurement
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Right: Forecast Chart & AI Summary */}
                    <div className="lg:col-span-8 space-y-4">
                      {/* Area Chart */}
                      <div className="p-4 rounded-2xl border border-border bg-card">
                        <div className="h-52 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={predictionData.chartPoints}>
                              <defs>
                                <linearGradient id="predictedSareeGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3B111A" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="#3B111A" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="label"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={10}
                                tickLine={false}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={10}
                                tickLine={false}
                              />
                              <RechartsTooltip contentStyle={tooltipStyle} />
                              <ReferenceLine
                                x={predictionData.chartPoints?.[29]?.label}
                                stroke="#3B111A"
                                strokeDasharray="4 4"
                                label={{
                                  value: 'Today',
                                  position: 'top',
                                  fill: 'hsl(var(--muted-foreground))',
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="historical"
                                name="Historical Dispatches"
                                stroke="#3B111A"
                                fill="url(#predictedSareeGrad)"
                                strokeWidth={2}
                              />
                              <Area
                                type="monotone"
                                dataKey="forecast"
                                name="Projected Demand"
                                stroke="#AC9C8D"
                                strokeDasharray="5 5"
                                fill="none"
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* AI Commentary */}
                      <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-bold text-foreground">
                            Intelligence Synthesis
                          </span>
                        </div>
                        <p className="text-xs italic text-muted-foreground leading-relaxed">
                          "{predictionData.aiAnalysis?.summary || 'AI projection generated from velocity models.'}"
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive block">
                              Identified Risks
                            </span>
                            {predictionData.aiAnalysis?.risks?.length ? (
                              predictionData.aiAnalysis.risks.map((risk, idx) => (
                                <p key={idx} className="text-[11px] text-muted-foreground">
                                  &bull; {risk}
                                </p>
                              ))
                            ) : (
                              <p className="text-[11px] text-muted-foreground">&bull; No immediate operational risks detected.</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                              Recommended Interventions
                            </span>
                            {predictionData.aiAnalysis?.actions?.length ? (
                              predictionData.aiAnalysis.actions.map((act, idx) => (
                                <p key={idx} className="text-[11px] text-muted-foreground">
                                  &bull; {act}
                                </p>
                              ))
                            ) : (
                              <p className="text-[11px] text-muted-foreground">&bull; Safety stock levels are optimal.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hierarchical Beam Breakdown Toggle */}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPredictionBreakdown(!showPredictionBreakdown)}
                      className="text-xs font-bold"
                    >
                      {showPredictionBreakdown ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 mr-1" />
                          Hide Combination Breakdown
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 mr-1" />
                          View Beam & Combination Breakdown
                        </>
                      )}
                    </Button>

                    {showPredictionBreakdown && (
                      <div className="mt-4 p-4 rounded-2xl border border-border bg-card space-y-3">
                        {(predictionData.beamsBreakdown || []).map((beam) => (
                          <div key={beam.id} className="border-b border-border/60 pb-3 last:border-0">
                            <div
                              onClick={() => setExpandedBeam(expandedBeam === beam.id ? null : beam.id)}
                              className="flex items-center justify-between cursor-pointer py-1 hover:text-burgundy-900 transition-colors"
                            >
                              <div className="flex items-center gap-2 font-bold text-xs">
                                {expandedBeam === beam.id ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                                <span>{beam.name}</span>
                              </div>
                              <span className="text-xs font-mono text-muted-foreground">
                                Stock: <strong>{beam.currentStock}</strong> | Forecast:{' '}
                                <strong>{beam.forecastDemand}</strong> | Order:{' '}
                                <strong className="text-amber-600 font-bold">
                                  +{beam.recommendedOrderQty}
                                </strong>
                              </span>
                            </div>

                            {expandedBeam === beam.id && (
                              <div className="pl-6 pt-2 space-y-1.5 border-l-2 border-border ml-2 mt-1">
                                {(beam.combinations || []).map((combo) => (
                                  <div
                                    key={combo.id}
                                    className="flex items-center justify-between text-xs text-muted-foreground py-0.5"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-foreground">{combo.name}</span>
                                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                                        {combo.brand || 'KP'}
                                      </Badge>
                                    </div>
                                    <span className="font-mono text-[11px]">
                                      Stock: {combo.currentStock} | Forecast: {combo.forecastDemand} |{' '}
                                      <span className="text-emerald-600 font-bold">
                                        +{combo.recommendedOrderQty}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stock Request Modal */}
      <RequestStockDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        combination={selectedCombo}
        beamName={selectedBeamName}
        seriesCode={selectedSeriesCode}
        sareeId={selectedSareeId}
        initialMovementType={requestMovementType}
        onSuccess={() => {
          fetchDashboardData();
          setRequestDialogOpen(false);
        }}
      />
    </div>
  );
};

export default Dashboard;
