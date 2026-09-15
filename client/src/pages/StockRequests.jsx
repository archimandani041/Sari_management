/**
 * Stock Requests — Visual Pipeline
 * Redesigned with shadcn/ui & Tailwind CSS
 * Features:
 * - Interactive stepper pipeline (Requested → Confirmed → Received)
 * - Clickable status metric summary cards
 * - Real-time stock arrival calculations
 * - WhatsApp direct weaver communications
 */
import { useState, useEffect, useCallback } from 'react';
import { stockRequestAPI } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
import {
  MessageCircle,
  CheckCircle2,
  Clock,
  Truck,
  Trash2,
  X,
  Plus,
  ArrowRight,
  TrendingUp,
  Inbox
} from 'lucide-react';

const PIPELINE_STEPS = ['Requested', 'Confirmed', 'Received'];

const PipelineStepper = ({ currentStatus }) => {
  if (currentStatus === 'Cancelled') {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-destructive" />
        <span className="text-xs font-bold uppercase tracking-wider text-destructive">
          Cancelled
        </span>
      </div>
    );
  }

  const currentIdx = PIPELINE_STEPS.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {PIPELINE_STEPS.map((step, idx) => {
        const isDone = idx <= currentIdx;
        const isActive = idx === currentIdx;

        return (
          <div key={step} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  isActive
                    ? "bg-amber-500 ring-4 ring-amber-500/20"
                    : isDone
                    ? "bg-burgundy-900 dark:bg-burgundy-400"
                    : "bg-muted-foreground/30"
                )}
              />
              <span
                className={cn(
                  "text-xs font-semibold tracking-wide",
                  isActive
                    ? "text-foreground font-bold"
                    : isDone
                    ? "text-foreground/80"
                    : "text-muted-foreground/60"
                )}
              >
                {step}
              </span>
            </div>

            {idx < PIPELINE_STEPS.length - 1 && (
              <div
                className={cn(
                  "w-6 sm:w-10 h-0.5 transition-colors",
                  isDone && idx < currentIdx ? "bg-burgundy-900/60" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const StockRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [receiveConfirm, setReceiveConfirm] = useState(null);
  const [snack, setSnack] = useState('');
  const [error, setError] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await stockRequestAPI.getAll({ status: statusFilter });
      setRequests(data.requests || []);
    } catch (e) {
      setError('Failed to load stock requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusChange = async (id, newStatus) => {
    if (newStatus === 'Received') {
      const req = requests.find((r) => r.id === id);
      setReceiveConfirm(req);
      return;
    }
    try {
      await stockRequestAPI.updateStatus(id, { status: newStatus });
      setSnack(`Status updated to ${newStatus}`);
      fetchRequests();
    } catch (e) {
      setError('Failed to update status');
    }
  };

  const confirmReceive = async () => {
    if (!receiveConfirm) return;
    try {
      await stockRequestAPI.updateStatus(receiveConfirm.id, { status: 'Received' });
      setSnack('Marked as Received — stock successfully updated!');
      setReceiveConfirm(null);
      fetchRequests();
    } catch (e) {
      setError('Failed to mark as received');
    }
  };

  const handleDelete = async () => {
    try {
      await stockRequestAPI.delete(deleteId);
      setDeleteId(null);
      setSnack('Stock request deleted.');
      fetchRequests();
    } catch (e) {
      setError('Failed to delete request');
    }
  };

  const openWhatsApp = (req) => {
    const mobile = (req.suppliers?.mobile || '').replace(/\D/g, '');
    if (!mobile) return;
    const msg = req.whatsapp_message || '';
    window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getMovementLabel = (req) => {
    if (req.movement_type === 'DELIVERY_OUT' || req.notes?.startsWith('DELIVERY_OUT')) {
      return 'Delivery Out';
    }
    return 'Stock In';
  };

  // Stats computation
  const stats = { Requested: 0, Confirmed: 0, Received: 0, Cancelled: 0 };
  requests.forEach((r) => {
    if (stats[r.status] !== undefined) stats[r.status]++;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast */}
      {snack && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-burgundy-900 text-white text-xs font-semibold shadow-luxury-lg animate-fade-in">
          <span>{snack}</span>
          <button onClick={() => setSnack('')} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Stock Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track weaver and supplier procurement cycles from initial request to receipt.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="Requested">Requested</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Interactive Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(stats).map(([status, count]) => {
          const isFilterActive = statusFilter === status;
          return (
            <Card
              key={status}
              onClick={() => setStatusFilter(isFilterActive ? '' : status)}
              className={cn(
                "cursor-pointer transition-all duration-200 border hover:shadow-luxury-hover",
                isFilterActive
                  ? "border-burgundy-900 ring-2 ring-burgundy-900/20 bg-burgundy-50/30 dark:bg-burgundy-900/10"
                  : "border-border hover:border-burgundy-900/30"
              )}
            >
              <CardContent className="p-4 text-center">
                <div className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                  {count}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                  {status}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
          {error}
        </div>
      )}

      {/* Requests List */}
      {loading && requests.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-card border border-border shadow-luxury">
          <Inbox className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">No Stock Requests</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            There are currently no stock procurement requests matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const movementLabel = getMovementLabel(req);
            const isDelivery = movementLabel === 'Delivery Out';

            return (
              <Card
                key={req.id}
                className="overflow-hidden border border-border shadow-luxury hover:shadow-luxury-hover transition-all duration-200"
              >
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Stepper Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                    <PipelineStepper currentStatus={req.status} />
                    <span className="text-xs text-muted-foreground font-medium">
                      {new Date(req.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      &bull;{' '}
                      {new Date(req.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>

                  {/* Core Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-6 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-foreground">
                          {req.series_code}
                        </span>
                        <Badge
                          variant={isDelivery ? "warning" : "success"}
                          className="text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider"
                        >
                          {movementLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {req.beam_name} &bull; {req.combination_name || 'Standard Combo'}
                      </p>
                    </div>

                    <div className="md:col-span-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Quantity
                      </span>
                      <span
                        className={cn(
                          "font-mono text-xl font-bold mt-0.5 block",
                          isDelivery ? "text-amber-600" : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {isDelivery ? '−' : '+'}{req.requested_qty} pcs
                      </span>
                    </div>

                    <div className="md:col-span-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Supplier / Weaver
                      </span>
                      <span className="text-sm font-semibold text-foreground block truncate mt-0.5">
                        {req.suppliers?.name || 'In-House'}
                      </span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      {req.suppliers?.mobile && req.status !== 'Received' && req.status !== 'Cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openWhatsApp(req)}
                          className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 font-semibold text-xs h-8"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                          WhatsApp
                        </Button>
                      )}

                      {req.status === 'Requested' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(req.id, 'Confirmed')}
                          className="font-semibold text-xs h-8"
                        >
                          Confirm Order
                        </Button>
                      )}

                      {(req.status === 'Requested' || req.status === 'Confirmed') && (
                        <Button
                          size="sm"
                          variant="luxury"
                          onClick={() => handleStatusChange(req.id, 'Received')}
                          className="font-semibold text-xs h-8 shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Mark Received
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteId(req.id)}
                      className="text-destructive hover:bg-destructive/10"
                      title="Delete request"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation of Stock Receipt Dialog */}
      <Dialog open={!!receiveConfirm} onOpenChange={(open) => !open && setReceiveConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Confirm Stock Receipt</DialogTitle>
            <DialogDescription>
              Confirm physical arrival of sarees to automatically update live warehouse inventory levels.
            </DialogDescription>
          </DialogHeader>

          {receiveConfirm && (
            <div className="space-y-3 py-2">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                <div className="font-semibold text-foreground">
                  {receiveConfirm.series_code} &bull; {receiveConfirm.beam_name} ({receiveConfirm.combination_name})
                </div>
                <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/50">
                  <span>Current Stock</span>
                  <span className="font-mono font-bold text-foreground">
                    {receiveConfirm.current_stock ?? 0} pcs
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Incoming Quantity</span>
                  <span className="font-mono font-bold text-emerald-600">
                    +{receiveConfirm.requested_qty} pcs
                  </span>
                </div>
                <div className="flex justify-between text-foreground font-bold pt-1.5 border-t border-border">
                  <span>Updated Total</span>
                  <span className="font-mono text-sm text-burgundy-900 dark:text-burgundy-300">
                    {(receiveConfirm.current_stock ?? 0) + receiveConfirm.requested_qty} pcs
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveConfirm(null)}>
              Cancel
            </Button>
            <Button variant="luxury" onClick={confirmReceive}>
              Confirm & Increment Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive font-serif">Delete Stock Request?</DialogTitle>
            <DialogDescription>
              This will permanently delete the request record from your procurement history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockRequests;
