/**
 * StockHistory — Professional ERP Inventory Audit Ledger
 * Redesigned with shadcn/ui & Tailwind CSS
 * Features:
 * - Executive KPI stat cards
 * - Dual view modes: Financial Ledger & Interactive Timeline
 * - Multi-action audit trail with custom badge taxonomy
 * - Fast filters, Excel export, and WhatsApp stock updates
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI, combinationAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import InventoryLedgerDrawer from '../components/common/InventoryLedgerDrawer';
import RequestStockDialog from '../components/common/RequestStockDialog';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { cn } from '../lib/utils';
import {
  Search,
  X,
  Download,
  TableProperties,
  Clock,
  Eye,
  MessageCircle,
  Trash2,
  RotateCcw,
  Plus,
  Truck,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';

const ACTION_BADGES = {
  'Stock In': { label: 'STOCK IN', variant: 'success' },
  'Stock': { label: 'STOCK IN', variant: 'success' },
  'Increase': { label: 'STOCK IN', variant: 'success' },
  'Stock Added': { label: 'STOCK IN', variant: 'success' },

  'Stock Delivery': { label: 'DELIVERY', variant: 'danger' },
  'Decrease': { label: 'DELIVERY', variant: 'danger' },

  'Delivery (Machine)': { label: 'MACHINE DLV', variant: 'info' },
  'Delivery': { label: 'MACHINE DLV', variant: 'info' },
  'Delivery Machine': { label: 'MACHINE DLV', variant: 'info' },

  'Return': { label: 'RETURN', variant: 'secondary' },
  'Damage': { label: 'DAMAGE', variant: 'destructive' },
  'Transfer': { label: 'TRANSFER', variant: 'outline' },
  'Manual Adjustment': { label: 'ADJUSTMENT', variant: 'warning' },
  'Manual Edit': { label: 'ADJUSTMENT', variant: 'warning' },
  'WhatsApp Import': { label: 'WA IMPORT', variant: 'success' },
  'WhatsApp Stock Request': { label: 'WA REQUEST', variant: 'success' },
  'Purchase Request Created': { label: 'PURCHASE REQ', variant: 'info' },
  'Purchase Received': { label: 'PURCHASE REC', variant: 'success' },
  'Combination Created': { label: 'COMBO CREATE', variant: 'info' },
  'Combination Edited': { label: 'COMBO EDIT', variant: 'warning' },
  'Combination Deleted': { label: 'COMBO DELETE', variant: 'destructive' },
  'Image Uploaded': { label: 'IMG UPLOAD', variant: 'info' },
  'Image Replaced': { label: 'IMG REPLACE', variant: 'warning' },
  'Image Deleted': { label: 'IMG DELETE', variant: 'destructive' },
  'Rollback': { label: 'ROLLBACK', variant: 'secondary' },
  'Undo': { label: 'ROLLBACK', variant: 'secondary' },
  'Import Failed': { label: 'IMPORT FAIL', variant: 'destructive' },
  'Duplicate Updated': { label: 'DUP UPDATE', variant: 'warning' },
};

const StockHistory = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState('ledger');

  // Summary stats
  const [stats, setStats] = useState({
    todayStockAdded: 0,
    todayDeliveries: 0,
    todayStockDeliveries: 0,
    todayReturns: 0,
    todayDamage: 0,
    todayRollbacks: 0
  });

  // Drawer, Rollback & Delete state
  const [selectedDrawerItem, setSelectedDrawerItem] = useState(null);
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [targetRollbackItem, setTargetRollbackItem] = useState(null);
  const [rollbackReasonInput, setRollbackReasonInput] = useState('Admin Audit Rollback');
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [deleteRecordModalOpen, setDeleteRecordModalOpen] = useState(false);
  const [targetDeleteItem, setTargetDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snack, setSnack] = useState('');

  // Request Stock via WhatsApp state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestCombo, setRequestCombo] = useState(null);
  const [requestBeamName, setRequestBeamName] = useState('');
  const [requestSeriesCode, setRequestSeriesCode] = useState('');
  const [requestSareeId, setRequestSareeId] = useState(null);

  const handleOpenRequestStock = async (item) => {
    if (!item?.combination_id) return;
    try {
      const { data } = await combinationAPI.getById(item.combination_id);
      if (data?.combination) {
        const combo = data.combination;
        setRequestCombo({ ...combo, brand: combo.brand || combo.beams?.sarees?.brand || 'KP' });
        setRequestBeamName(combo.beams?.beam_name || item.beam_name || 'Beam');
        setRequestSeriesCode(combo.beams?.sarees?.series_code || item.series_code || 'Saree');
        setRequestSareeId(combo.beams?.saree_id || item.saree_id);
        setRequestDialogOpen(true);
        return;
      }
    } catch (_) {}

    setRequestCombo({
      id: item.combination_id,
      combination_name: item.combination_name || 'Combination',
      current_stock: item.new_stock ?? 0,
      minimum_stock: item.combinations?.minimum_stock ?? 20,
      combination_colors: item.combinations?.combination_colors || [],
      brand: item.combinations?.brand || 'KP'
    });
    setRequestBeamName(item.beam_name || 'Beam');
    setRequestSeriesCode(item.series_code || 'Saree');
    setRequestSareeId(item.saree_id);
    setRequestDialogOpen(true);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchStats = async () => {
    try {
      const { data } = await stockAPI.getStats();
      setStats(data);
    } catch (_) {}
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await stockAPI.getHistory({
        page: page + 1,
        limit: rowsPerPage,
        action: action === 'all' ? undefined : action,
        search: debouncedSearch || undefined
      });
      setHistory(data.history || []);
      setTotal(data.pagination?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, action, debouncedSearch]);

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, [fetchHistory]);

  const handleExecuteRollback = async () => {
    if (!targetRollbackItem) return;
    setRollbackLoading(true);
    try {
      const res = await stockAPI.rollback(targetRollbackItem.id, { reason: rollbackReasonInput });
      setSnack(res.data.message || 'Transaction successfully rolled back.');
      setRollbackModalOpen(false);
      setTargetRollbackItem(null);
      fetchHistory();
      fetchStats();
    } catch (err) {
      setSnack(err.response?.data?.error || 'Failed to rollback transaction.');
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleExecuteDeleteRecord = async () => {
    if (!targetDeleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await stockAPI.deleteHistory(targetDeleteItem.id);
      setSnack(res.data?.message || 'History record deleted.');
      setDeleteRecordModalOpen(false);
      setTargetDeleteItem(null);
      fetchHistory();
      fetchStats();
    } catch (err) {
      setSnack(err.response?.data?.error || 'Failed to delete history record.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = (format) => {
    const rows = history.map(h => ({
      'Transaction ID': h.id,
      'Date': new Date(h.created_at).toLocaleDateString(),
      'Time': new Date(h.created_at).toLocaleTimeString(),
      'Sari Number': h.sarees?.series_code || h.series_code || '',
      'Beam': h.beam_name || '',
      'Combination': h.combination_name || '',
      'Action': h.action,
      'Opening Stock': h.old_stock,
      'Closing Stock': h.new_stock,
      'User': h.changed_by_name || 'System',
      'Supplier': h.supplier_name || '',
      'Customer': h.customer_name || '',
      'Machine': h.machine_name || '',
      'Invoice': h.invoice_number || '',
      'Status': h.is_rolled_back ? 'Rolled Back' : 'Completed'
    }));

    if (format === 'excel') {
      const ws = xlsxUtils.json_to_sheet(rows);
      const wb = xlsxUtils.book_new();
      xlsxUtils.book_append_sheet(wb, ws, 'Inventory Ledger');
      xlsxWriteFile(wb, 'Inventory_Ledger.xlsx');
    } else if (format === 'print') {
      window.print();
    }
  };

  const totalPages = Math.ceil(total / rowsPerPage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast message */}
      {snack && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-burgundy-900 text-white text-xs font-semibold shadow-luxury-lg animate-fade-in">
          <span>{snack}</span>
          <button onClick={() => setSnack('')} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Audit Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable audit record of all saree movements, loom deliveries, and adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border bg-card p-1">
            <Button
              variant={viewMode === 'ledger' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('ledger')}
              className="text-xs font-semibold h-8"
            >
              <TableProperties className="w-3.5 h-3.5 mr-1.5" />
              Ledger
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className="text-xs font-semibold h-8"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Timeline
            </Button>
          </div>

          <Button
            variant="luxury"
            size="sm"
            onClick={() => handleExport('excel')}
            className="text-xs font-semibold h-9 shadow-luxury"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Executive Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border shadow-luxury">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Stock Added
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                +{stats.todayStockAdded} pcs
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-luxury">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Machine Deliveries
              </span>
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                {stats.todayDeliveries} pcs
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-luxury">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Dispatch Delivery
              </span>
              <div className="text-2xl font-bold font-mono text-destructive mt-1">
                -{stats.todayStockDeliveries} pcs
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-destructive/10 text-destructive">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Saree, Beam, Combo, Invoice, Machine, Supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
              className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-full sm:w-auto"
            >
              <option value="all">All Action Events</option>
              <option value="Stock In">Stock In</option>
              <option value="Stock Delivery">Stock Delivery</option>
              <option value="Delivery (Machine)">Delivery (Machine)</option>
              <option value="Return">Return</option>
              <option value="Damage">Damage</option>
              <option value="Manual Adjustment">Adjustment</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Ledger Table View */}
      {viewMode === 'ledger' ? (
        <Card className="border border-border shadow-luxury overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase">Date & Time</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Saree Details</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Beam / Combo</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Action Event</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Movement</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((n) => (
                    <TableRow key={n}>
                      <TableCell colSpan={6} className="py-4">
                        <div className="h-6 w-full bg-muted/50 rounded-md animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <TableProperties className="w-8 h-8 opacity-40" />
                        <span className="text-sm font-medium">No ledger records found.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item) => {
                    const badge = ACTION_BADGES[item.action] || { label: item.action, variant: 'secondary' };
                    const isRolledBack = item.is_rolled_back;

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          "transition-colors",
                          isRolledBack && "opacity-50 line-through bg-muted/20"
                        )}
                      >
                        {/* Date & Time */}
                        <TableCell className="py-3">
                          <div className="text-xs font-semibold text-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>

                        {/* Saree & Thumbnail */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt="Saree"
                                className="w-8 h-8 rounded-md object-cover border border-border"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground border border-border">
                                🧵
                              </div>
                            )}
                            <div>
                              <button
                                type="button"
                                onClick={() => item.saree_id && navigate(`/sarees/${item.saree_id}`)}
                                className="font-mono text-xs font-bold text-foreground hover:text-burgundy-900 dark:hover:text-burgundy-300"
                              >
                                {item.sarees?.series_code || item.series_code || '—'}
                              </button>
                              <div className="text-[10px] text-muted-foreground">
                                By {item.changed_by_name || 'System'}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Beam & Combination */}
                        <TableCell className="py-3">
                          <div className="text-xs font-semibold text-foreground">
                            {item.beam_name || 'Standard'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.combination_name || '—'}
                          </div>
                        </TableCell>

                        {/* Action Event Badge */}
                        <TableCell className="py-3">
                          <Badge variant={badge.variant} className="text-[10px] font-bold px-2 py-0.5">
                            {badge.label}
                          </Badge>
                        </TableCell>

                        {/* Stock Movement */}
                        <TableCell className="py-3">
                          <div className="flex items-baseline gap-1 font-mono text-xs font-bold">
                            <span className="text-muted-foreground">{item.old_stock}</span>
                            <span className="text-muted-foreground/60">&rarr;</span>
                            <span
                              className={cn(
                                item.new_stock > item.old_stock
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : item.new_stock < item.old_stock
                                  ? "text-destructive"
                                  : "text-foreground"
                              )}
                            >
                              {item.new_stock}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Audit Drawer"
                              onClick={() => setSelectedDrawerItem(item)}
                            >
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Update Stock via WhatsApp"
                              onClick={() => handleOpenRequestStock(item)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Delete Record"
                                onClick={() => {
                                  setTargetDeleteItem(item);
                                  setDeleteRecordModalOpen(true);
                                }}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border text-xs text-muted-foreground">
            <div>
              Showing {total === 0 ? 0 : page * rowsPerPage + 1} to{' '}
              {Math.min((page + 1) * rowsPerPage, total)} of {total} events
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </Button>
              <span className="font-semibold text-foreground px-1">
                {page + 1} of {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages}
                className="h-8 px-2.5"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Timeline View */
        <Card className="border border-border shadow-luxury p-6">
          <div className="space-y-6 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-border">
            {history.map((item) => (
              <div key={item.id} className="relative flex items-start gap-4 pl-8">
                <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-burgundy-900 border-2 border-background" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {item.action}
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {item.sarees?.series_code || item.series_code} &bull; {item.beam_name} ({item.combination_name})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stock shift: <span className="font-mono font-semibold">{item.old_stock} &rarr; {item.new_stock}</span> | Operator: {item.changed_by_name || 'System'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Inventory Drawer */}
      <InventoryLedgerDrawer
        open={Boolean(selectedDrawerItem)}
        onClose={() => setSelectedDrawerItem(null)}
        item={selectedDrawerItem}
        isAdmin={isAdmin}
        onUpdateStock={handleOpenRequestStock}
        onRollback={(item) => {
          setSelectedDrawerItem(null);
          setTargetRollbackItem(item);
          setRollbackModalOpen(true);
        }}
        onDeleteRecord={(item) => {
          setSelectedDrawerItem(null);
          setTargetDeleteItem(item);
          setDeleteRecordModalOpen(true);
        }}
      />

      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackModalOpen} onOpenChange={setRollbackModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive font-serif">Rollback Inventory Event</DialogTitle>
            <DialogDescription>
              Rolling back this transaction will reverse the stock shift and create an immutable audit rollback entry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={rollbackReasonInput}
              onChange={(e) => setRollbackReasonInput(e.target.value)}
              placeholder="Reason for audit reversal..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteRollback}
              disabled={rollbackLoading}
            >
              {rollbackLoading ? 'Rolling back...' : 'Confirm Rollback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Record Confirmation Dialog */}
      <Dialog open={deleteRecordModalOpen} onOpenChange={setDeleteRecordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive font-serif">Delete History Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove this transaction? Any corresponding stock shifts will be safely reversed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteDeleteRecord}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Rollback & Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Stock Request Dialog */}
      <RequestStockDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        combination={requestCombo}
        beamName={requestBeamName}
        seriesCode={requestSeriesCode}
        sareeId={requestSareeId}
        onSuccess={() => {
          fetchHistory();
          fetchStats();
          setRequestDialogOpen(false);
          setSnack('Stock updated successfully via WhatsApp!');
        }}
      />
    </div>
  );
};

export default StockHistory;
