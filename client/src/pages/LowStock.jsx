/**
 * Low Stock — Action Page
 * Redesigned with shadcn/ui & Tailwind CSS
 * Action-oriented inventory recovery dashboard with live progress indicators and WhatsApp triggers.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sareeAPI } from '../services/api';
import { supabase } from '../services/supabase';
import RequestStockDialog from '../components/common/RequestStockDialog';
import { getStockHealth } from '../constants/terms';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  Layers,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';

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

  useEffect(() => {
    fetchLowStockSarees();
  }, []);

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
      lowItems.push({
        saree,
        beam: null,
        combo: null,
        stock: saree.total_stock ?? 0,
        min: saree.min_stock ?? 20,
        shortage: Math.max(0, (saree.min_stock ?? 20) - (saree.total_stock ?? 0))
      });
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
    setSelectedCombo({ ...item.combo, brand: item.saree.brand || item.combo.brand });
    setSelectedBeamName(item.beam?.beam_name || 'Beam');
    setSelectedSeriesCode(item.saree.series_code || '');
    setSelectedSareeId(item.saree.id);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const criticalCount = lowItems.filter(i => i.stock === 0).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Needs Stock
            </h1>
            {lowItems.length > 0 && (
              <Badge variant="destructive" className="ml-2 font-bold px-2 py-0.5">
                {lowItems.length} items
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Combinations currently below minimum safety stock levels. Dispatch replenishment requests directly.
          </p>
        </div>

        {criticalCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
            <TrendingDown className="w-4 h-4" />
            <span>{criticalCount} completely depleted (0 pcs)</span>
          </div>
        )}
      </div>

      {lowItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-card border border-border shadow-luxury">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">All Stock Levels Healthy</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            There are currently zero sarees or combinations below their designated minimum stock thresholds.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lowItems.map((item, idx) => {
            const health = getStockHealth(item.stock, item.min);
            const isCritical = item.stock === 0;
            const pct = item.min > 0 ? Math.round((item.stock / item.min) * 100) : 0;

            return (
              <Card
                key={`${item.saree.id}-${item.combo?.id || idx}`}
                className={cn(
                  "overflow-hidden border transition-all duration-200 hover:shadow-luxury-hover",
                  isCritical
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-amber-500/30 bg-amber-500/5"
                )}
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Item Information */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/sarees/${item.saree.id}`)}
                          className="font-mono text-base font-bold text-foreground hover:text-burgundy-900 dark:hover:text-burgundy-300 transition-colors inline-flex items-center gap-1 group"
                        >
                          <span>{item.saree.series_code}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <Badge
                          variant={isCritical ? "danger" : "warning"}
                          className="text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase"
                        >
                          {isCritical ? 'Critical · 0 pcs' : 'Low Stock'}
                        </Badge>

                        {item.saree.brand && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {item.saree.brand}
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-medium text-foreground">
                        {item.beam && (
                          <span className="text-muted-foreground font-normal">
                            {item.beam.beam_name} &bull;{' '}
                          </span>
                        )}
                        <span>
                          {item.combo?.combination_name || item.saree.sari_name || 'Standard Combination'}
                        </span>
                      </div>

                      {/* Combination Colors List */}
                      {item.combo?.combination_colors && item.combo.combination_colors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.combo.combination_colors.map((col, cIdx) => (
                            <span
                              key={col.id || cIdx}
                              className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                            >
                              <span className="font-bold mr-1">{col.f_number || `F-${cIdx + 1}`}:</span>
                              {col.color_name}
                              {col.company_name && (
                                <span className="opacity-70 ml-1">({col.company_name})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stock Metrics & Progress */}
                    <div className="flex items-center gap-6 shrink-0 pt-2 md:pt-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Current / Min
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span
                            className={cn(
                              "text-xl font-bold font-mono",
                              isCritical ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {item.stock}
                          </span>
                          <span className="text-xs text-muted-foreground font-semibold">
                            / {item.min} pcs
                          </span>
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-destructive block">
                          Shortage
                        </span>
                        <span className="text-xl font-bold font-mono text-destructive mt-0.5 block">
                          -{item.shortage}
                        </span>
                      </div>

                      {/* Stock Percentage Bar */}
                      <div className="hidden lg:block w-28">
                        <span className="text-[10px] font-semibold text-muted-foreground block text-right mb-1">
                          {Math.min(pct, 100)}%
                        </span>
                        <Progress
                          value={Math.min(pct, 100)}
                          className="h-2 bg-muted"
                          indicatorClassName={isCritical ? "bg-destructive" : "bg-amber-500"}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 md:pt-0 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => openRequest(item)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                        Request Stock
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/sarees/${item.saree.id}`)}
                        className="text-xs font-semibold"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stock Request Dialog */}
      <RequestStockDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        combination={selectedCombo}
        beamName={selectedBeamName}
        seriesCode={selectedSeriesCode}
        sareeId={selectedSareeId}
        initialMovementType="STOCK"
        onSuccess={() => {
          fetchLowStockSarees();
          setDialogOpen(false);
        }}
      />
    </div>
  );
};

export default LowStock;
