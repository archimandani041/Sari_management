/**
 * Saree Details Page — Redesigned with shadcn/ui & Tailwind CSS
 * Editorial Luxury Control Panel with live beam hierarchy breakdown, series letter management,
 * and direct WhatsApp replenishment triggers.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sareeAPI } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import RequestStockDialog from '../components/common/RequestStockDialog';
import { useDebouncedCallback } from '../hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';
import { useSnackbar } from 'notistack';
import {
  ArrowLeft,
  Printer,
  Heart,
  Pencil,
  Trash2,
  Sparkles,
  MessageCircle,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FastForward,
  X
} from 'lucide-react';

const SareeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isStaff } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { addRecentlyViewed, toggleFavorite, isFavorite } = useApp();

  const [saree, setSaree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Next Series dialog
  const [seriesConfirmOpen, setSeriesConfirmOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [manualSeriesLetter, setManualSeriesLetter] = useState('');

  // Request Stock dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestCombo, setRequestCombo] = useState(null);
  const [requestBeamName, setRequestBeamName] = useState('');

  // Delete dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fetchSareeDetails = async () => {
    try {
      const { data } = await sareeAPI.getById(id);
      setSaree(data.saree);
      addRecentlyViewed(data.saree);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch saree details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSareeDetails();
  }, [id]);

  const handleRealtimeUpdate = useDebouncedCallback(() => {
    fetchSareeDetails();
  }, 300);

  useEffect(() => {
    if (!supabase || !id) return;

    const channel = supabase
      .channel(`realtime-saree-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combinations' }, () => {
        handleRealtimeUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beams' }, () => {
        handleRealtimeUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sarees', filter: `id=eq.${id}` }, () => {
        handleRealtimeUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, handleRealtimeUpdate]);

  const handleNextSeriesConfirm = async () => {
    try {
      const { data } = await sareeAPI.nextSeries(saree.id);
      setSeriesConfirmOpen(false);
      setSeriesDialogOpen(false);
      setActionSuccess(`Advanced series code to ${data.saree.series_code}`);
      enqueueSnackbar(`Advanced to series ${data.saree.series_code}`, { variant: 'success' });
      fetchSareeDetails();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to advance series.');
    }
  };

  const handleSetSeries = async (letter) => {
    if (!letter || letter.length !== 1) return;
    try {
      const { data } = await sareeAPI.setSeries(saree.id, { series_letter: letter.toUpperCase() });
      setSeriesDialogOpen(false);
      setManualSeriesLetter('');
      setActionSuccess(`Series code changed to ${data.saree.series_code}`);
      enqueueSnackbar(`Series changed to ${data.saree.series_code}`, { variant: 'success' });
      fetchSareeDetails();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to set series.');
    }
  };

  const handleUndoSeries = () => {
    if (!saree?.series_letter || saree.series_letter === 'A') return;
    const prevLetter = String.fromCharCode(saree.series_letter.charCodeAt(0) - 1);
    handleSetSeries(prevLetter);
  };

  const handleDeleteConfirm = async () => {
    try {
      await sareeAPI.delete(saree.id);
      setDeleteConfirmOpen(false);
      enqueueSnackbar('Saree deleted successfully.', { variant: 'success' });
      navigate('/sarees');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete saree.');
    }
  };

  if (loading && !saree) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="md:col-span-2 h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!saree) {
    return (
      <div className="p-8 text-center text-destructive text-sm font-semibold">
        Saree record not found.
      </div>
    );
  }

  const totalStock = (saree.beams || []).reduce((sum, b) =>
    sum + (b.combinations || []).reduce((cs, c) => cs + (c.current_stock || 0), 0), 0
  );
  const minStock = (saree.beams || []).reduce((min, b) =>
    Math.min(min, ...(b.combinations || []).map(c => c.minimum_stock || 20)), 20
  );

  const getStockStatus = (total, min) => {
    if (total === 0) return { label: 'OUT OF STOCK', variant: 'danger' };
    if (total <= min) return { label: 'LOW STOCK', variant: 'warning' };
    return { label: 'HEALTHY', variant: 'success' };
  };
  const statusInfo = getStockStatus(totalStock, minStock);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Alert Notices */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate('/sarees')}
            title="Back to Catalog"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {saree.sari_name || 'Design Details'}
              </h1>
              <Badge variant="luxury" className="font-mono font-bold text-xs px-2 py-0.5">
                {saree.series_code}
              </Badge>

              <button
                type="button"
                onClick={() => toggleFavorite(saree.id)}
                className="p-1 rounded-full text-muted-foreground hover:text-destructive transition-colors ml-1"
                title="Favorite"
              >
                <Heart
                  className={cn(
                    "w-4 h-4",
                    isFavorite(saree.id) && "fill-destructive text-destructive"
                  )}
                />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">
              Series Base: <strong className="font-mono">{saree.series_base || 'KP'}</strong> &bull; Variant Letter: <strong className="font-mono">{saree.series_letter || 'A'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs font-semibold h-9"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Sheet
          </Button>

          {(isAdmin || isStaff) && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setManualSeriesLetter(saree?.series_letter || 'A');
                  setSeriesDialogOpen(true);
                }}
                className="text-xs font-semibold h-9"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Series Options
              </Button>

              <Button
                variant="luxury"
                size="sm"
                onClick={() => navigate(`/sarees/edit/${saree.id}`)}
                className="text-xs font-bold h-9 shadow-luxury"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleteConfirmOpen(true)}
                className="text-destructive hover:bg-destructive/10 h-9 w-9"
                title="Delete Saree"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border border-border shadow-luxury overflow-hidden">
            {saree.image_url && (
              <div className="w-full h-64 overflow-hidden bg-muted">
                <img
                  src={saree.image_url}
                  alt={saree.sari_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-serif">Saree Specifications</CardTitle>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Series Code</span>
                <span className="font-mono font-bold text-foreground">{saree.series_code}</span>
              </div>

              <div className="flex justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Brand Line</span>
                <span className="font-semibold text-foreground">{saree.brand || 'KP'}</span>
              </div>

              <div className="flex justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Price</span>
                <span className="font-mono font-bold text-burgundy-900 dark:text-burgundy-300 text-sm">
                  {saree.price != null ? `₹${Number(saree.price).toLocaleString('en-IN')}` : '—'}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Total Stock</span>
                <span className="font-mono font-bold text-foreground">{totalStock} pcs</span>
              </div>

              <div className="flex justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Inventory Status</span>
                <Badge variant={statusInfo.variant} className="text-[10px] font-bold px-1.5 py-0">
                  {statusInfo.label}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Beams Registered</span>
                <span className="font-bold text-foreground">{saree.beams?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Beams & Combinations Hierarchy */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border border-border shadow-luxury">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-serif flex items-center gap-2">
                <Layers className="w-4 h-4 text-burgundy-900 dark:text-burgundy-300" />
                Beams & Combinations Architecture
              </CardTitle>
              <CardDescription className="text-xs">
                Structural breakdown of warp beams, yarn combination codes, and inventory levels
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-5">
              {(!saree.beams || saree.beams.length === 0) ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No warp beams configured for this saree design.
                </div>
              ) : (
                saree.beams.map((beam) => (
                  <div
                    key={beam.id}
                    className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-burgundy-900 dark:text-burgundy-300">
                        {beam.beam_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {beam.combinations?.length || 0} combinations
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {(beam.combinations || []).map((combo) => {
                        const isLow = (combo.current_stock ?? 0) <= (combo.minimum_stock ?? 20);

                        return (
                          <div
                            key={combo.id}
                            className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {combo.image_url && (
                                <img
                                  src={combo.image_url}
                                  alt=""
                                  className="w-12 h-12 rounded-md object-cover border border-border shrink-0"
                                />
                              )}
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">
                                    {combo.combination_name}
                                  </span>
                                  <Badge
                                    variant={
                                      combo.status === 'In Stock'
                                        ? 'success'
                                        : combo.status === 'Out of Stock'
                                        ? 'danger'
                                        : 'secondary'
                                    }
                                    className="text-[9px] px-1.5 py-0 font-bold"
                                  >
                                    {combo.status || 'Active'}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  {combo.combination_colors?.map((col) => (
                                    <span
                                      key={col.id}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                    >
                                      <strong>{col.f_number}:</strong> {col.color_name}
                                      {col.company_name && (
                                        <span className="opacity-70 ml-0.5">({col.company_name})</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                              <div className="text-left sm:text-right">
                                <span
                                  className={cn(
                                    "font-mono text-xs font-bold block",
                                    isLow ? "text-amber-600" : "text-foreground"
                                  )}
                                >
                                  {combo.current_stock ?? 0} pcs
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  Min: {combo.minimum_stock ?? 20}
                                </span>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRequestCombo(combo);
                                  setRequestBeamName(beam.beam_name);
                                  setRequestDialogOpen(true);
                                }}
                                className="h-7 text-[11px] font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                              >
                                <MessageCircle className="w-3 h-3 mr-1" />
                                WhatsApp
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Series Management Modal */}
      <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Series Version Control</DialogTitle>
            <DialogDescription>
              Adjust or increment the series letter (e.g. 101A &rarr; 101B) for fresh weave rollouts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
              <span className="text-muted-foreground font-medium">Current Series Code:</span>
              <Badge variant="luxury" className="font-mono text-xs font-bold">
                {saree?.series_code}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndoSeries}
                disabled={!saree?.series_letter || saree.series_letter === 'A'}
                className="text-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Undo Step
              </Button>
              <Button
                variant="luxury"
                size="sm"
                onClick={() => setSeriesConfirmOpen(true)}
                disabled={saree?.series_letter === 'Z'}
                className="text-xs font-bold"
              >
                <FastForward className="w-3.5 h-3.5 mr-1" />
                Next Series
              </Button>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Or designate custom letter:
              </span>
              <div className="flex gap-2">
                <Input
                  value={manualSeriesLetter}
                  onChange={(e) =>
                    setManualSeriesLetter(
                      e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1)
                    )
                  }
                  placeholder="A-Z"
                  maxLength={1}
                  className="font-mono font-bold text-center h-9 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetSeries(manualSeriesLetter)}
                  disabled={!manualSeriesLetter || manualSeriesLetter === saree?.series_letter}
                  className="h-9 px-4 text-xs font-bold"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Next Series Confirmation Dialog */}
      <Dialog open={seriesConfirmOpen} onOpenChange={setSeriesConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Advance to Next Series?</DialogTitle>
            <DialogDescription>
              This will increment the series letter for this catalog item and apply immediately across the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeriesConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="luxury" onClick={handleNextSeriesConfirm}>
              Advance Series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive font-serif">Delete Saree Design?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{saree.series_code}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
            <span className="font-bold block">Permanent Action:</span>
            <span>All beams, combinations, color codes, and historical records will be deleted.</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Stock Request Modal */}
      {requestCombo && (
        <RequestStockDialog
          open={requestDialogOpen}
          onClose={() => {
            setRequestDialogOpen(false);
            setRequestCombo(null);
          }}
          seriesCode={saree.series_code}
          sareeId={saree.id}
          beamName={requestBeamName}
          combination={requestCombo}
          onSuccess={() => {
            enqueueSnackbar('Stock replenishment request dispatched via WhatsApp!', { variant: 'success' });
            fetchSareeDetails();
          }}
        />
      )}
    </div>
  );
};

export default SareeDetail;
