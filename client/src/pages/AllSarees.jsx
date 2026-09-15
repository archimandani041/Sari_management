/**
 * All Sarees Management Page — Redesigned with shadcn/ui & Tailwind CSS
 * Editorial Luxury Saree Catalog with Deep Hierarchy Breakdown, Stock Capacity Telemetry,
 * Dynamic Highlighting, and WhatsApp Replenishment Triggers.
 */
import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sareeAPI } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce, useDebouncedCallback } from '../hooks/useDebounce';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { cn } from '../lib/utils';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';
import { getStockHealth } from '../constants/terms';
import RequestStockDialog from '../components/common/RequestStockDialog';
import {
  Plus,
  Download,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  MessageCircle,
  History,
  Layers,
  Sparkles,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';

const getStockStatus = (total, min) => {
  if (!total || total === 0) {
    return { label: 'Out of Stock', variant: 'danger', barClass: 'bg-destructive' };
  }
  if (total <= (min ?? 0)) {
    return { label: 'Low Stock', variant: 'warning', barClass: 'bg-amber-500' };
  }
  return { label: 'In Stock', variant: 'success', barClass: 'bg-emerald-600' };
};

const StockBar = ({ total, min, max, barClass }) => {
  const value = total ?? 0;
  const cap = max && max > 0 ? max : Math.max(value, (min ?? 0) * 2, 1);
  const pct = value > 0 ? Math.max(6, Math.min(100, Math.round((value / cap) * 100))) : 0;

  return (
    <div className="min-w-[140px] max-w-[200px] space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-mono font-bold text-foreground">
          {value} <span className="text-[10px] font-normal text-muted-foreground">pcs</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          Min {min ?? 0}
        </span>
      </div>
      <Progress value={pct} className="h-1.5 bg-muted" indicatorClassName={barClass} />
    </div>
  );
};

const AllSarees = () => {
  const { isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightComboId = searchParams.get('highlightComboId');

  // Search/Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [company, setCompany] = useState('');
  const [color, setColor] = useState('');
  const [brandFilter, setBrandFilter] = useState(searchParams.get('brand') || '');
  const [sareeStatusFilter, setSareeStatusFilter] = useState(searchParams.get('saree_status') || '');

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Data states
  const [sarees, setSarees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Delete dialog
  const [deleteSareeObj, setDeleteSareeObj] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Request Stock Dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestCombo, setRequestCombo] = useState(null);
  const [requestBeamName, setRequestBeamName] = useState('');
  const [requestSeriesCode, setRequestSeriesCode] = useState('');
  const [requestSareeId, setRequestSareeId] = useState('');
  const [requestMovementType, setRequestMovementType] = useState('STOCK');

  const openStockDialog = (combo, beam, saree, type = 'STOCK') => {
    setRequestCombo({ ...combo, brand: saree.brand || combo.brand });
    setRequestBeamName(beam.beam_name);
    setRequestSeriesCode(saree.series_code);
    setRequestSareeId(saree.id);
    setRequestMovementType(type);
    setRequestDialogOpen(true);
  };

  const debouncedSearch = useDebounce(search, 300);
  const debouncedCompany = useDebounce(company, 300);
  const debouncedColor = useDebounce(color, 300);

  const [expandedSarees, setExpandedSarees] = useState({});

  const toggleExpand = (sareeId) => {
    setExpandedSarees((prev) => ({
      ...prev,
      [sareeId]: !prev[sareeId],
    }));
  };

  useEffect(() => {
    const searchVal = searchParams.get('search') || '';
    if (searchVal !== search) setSearch(searchVal);
    const statusVal = searchParams.get('status') || '';
    if (statusVal !== status) setStatus(statusVal);
    const brandVal = searchParams.get('brand') || '';
    if (brandVal !== brandFilter) setBrandFilter(brandVal);
    const sareeStatusVal = searchParams.get('saree_status') || '';
    if (sareeStatusVal !== sareeStatusFilter) setSareeStatusFilter(sareeStatusVal);
    const sortVal = searchParams.get('sort') || 'newest';
    if (sortVal !== sort) setSort(sortVal);
  }, [searchParams]);

  const isDeepSearchActive = !!(
    debouncedSearch || debouncedCompany || debouncedColor ||
    brandFilter || sareeStatusFilter
  );

  useEffect(() => {
    if (isDeepSearchActive) {
      const expanded = {};
      sarees.forEach((s) => {
        expanded[s.id] = true;
      });
      setExpandedSarees(expanded);
    } else {
      setExpandedSarees({});
    }
  }, [isDeepSearchActive, sarees]);

  useEffect(() => {
    const expandId = searchParams.get('expandSareeId');
    const highlightId = searchParams.get('highlightComboId');
    if (expandId && sarees.length > 0) {
      setExpandedSarees((prev) => ({
        ...prev,
        [expandId]: true,
      }));
      const timer = setTimeout(() => {
        const targetId = highlightId ? `combo-row-${highlightId}` : `saree-row-${expandId}`;
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [searchParams, sarees]);

  const hasAnyFilter = !!(
    search || status || company || color || brandFilter || sareeStatusFilter || sort !== 'newest'
  );

  const clearAllFilters = () => {
    setSearch('');
    setStatus('');
    setSort('newest');
    setCompany('');
    setColor('');
    setBrandFilter('');
    setSareeStatusFilter('');
    setPage(0);
  };

  const highlightText = (text, highlight) => {
    if (!highlight || !text) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span
              key={i}
              className="bg-amber-400/30 text-foreground font-extrabold rounded-xs px-0.5"
            >
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const renderHighlighted = (text, fieldType) => {
    if (!text) return '';
    let matchTerm = '';

    if (fieldType === 'company') {
      matchTerm = debouncedCompany || (debouncedSearch && text.toLowerCase().includes(debouncedSearch.toLowerCase()) ? debouncedSearch : '');
    } else if (fieldType === 'color') {
      matchTerm = debouncedColor || (debouncedSearch && text.toLowerCase().includes(debouncedSearch.toLowerCase()) ? debouncedSearch : '');
    } else {
      matchTerm = debouncedSearch;
    }

    return highlightText(text, matchTerm);
  };

  const naturalSort = (a, b) => (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });

  const getFilteredHierarchy = (saree) => {
    const query = debouncedSearch?.toLowerCase().trim();
    const companyQ = debouncedCompany?.toLowerCase().trim();
    const colorQ = debouncedColor?.toLowerCase().trim();
    const brandQ = brandFilter?.toLowerCase().trim();
    const statusQ = sareeStatusFilter?.toLowerCase().trim();

    const hasFilters = !!(query || companyQ || colorQ || brandQ || statusQ);

    if (!hasFilters) {
      return [...(saree.beams || [])]
        .map(beam => ({
          ...beam,
          combinations: [...(beam.combinations || [])].sort((a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) || naturalSort(a.combination_name, b.combination_name)
          )
        }))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || naturalSort(a.beam_name, b.beam_name));
    }

    const matchedBeams = [];

    for (const beam of (saree.beams || [])) {
      const beamNameMatch = query && beam.beam_name?.toLowerCase().includes(query);
      const matchedCombinations = [];

      for (const combo of (beam.combinations || [])) {
        const brandMatch = !brandQ || (saree.brand?.toLowerCase() === brandQ);
        const statusMatch = !statusQ || (combo.status?.toLowerCase() === statusQ);

        if (!brandMatch || !statusMatch) continue;

        const comboNameMatch = query && combo.combination_name?.toLowerCase().includes(query);
        const comboNotesMatch = query && combo.notes?.toLowerCase().includes(query);

        const matchedColors = (combo.combination_colors || []).filter(col => {
          const colorNameMatch = query && col.color_name?.toLowerCase().includes(query);
          const colorCompanyMatch = query && col.company_name?.toLowerCase().includes(query);

          const companyFilterMatch = !companyQ || col.company_name?.toLowerCase().includes(companyQ);
          const colorFilterMatch = !colorQ || col.color_name?.toLowerCase().includes(colorQ);

          if (companyQ || colorQ) {
            return companyFilterMatch && colorFilterMatch;
          }

          return !query || colorNameMatch || colorCompanyMatch;
        });

        const sareeMatch = query && (
          saree.sari_name?.toLowerCase().includes(query) ||
          saree.series_code?.toLowerCase().includes(query)
        );

        const isColorMatch = (companyQ || colorQ)
          ? (matchedColors.length > 0)
          : (query ? (matchedColors.length > 0 || comboNameMatch || comboNotesMatch) : true);

        const isBeamOrSareeMatch = sareeMatch || beamNameMatch;

        if (isColorMatch || isBeamOrSareeMatch) {
          matchedCombinations.push({
            ...combo,
            combination_colors: combo.combination_colors || []
          });
        }
      }

      if (matchedCombinations.length > 0 || beamNameMatch) {
        matchedCombinations.sort((a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) || naturalSort(a.combination_name, b.combination_name)
        );
        matchedBeams.push({
          ...beam,
          combinations: matchedCombinations
        });
      }
    }

    return matchedBeams.sort((a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) || naturalSort(a.beam_name, b.beam_name)
    );
  };

  const fetchSarees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: debouncedSearch,
        sort,
        status,
        company: debouncedCompany,
        color: debouncedColor,
        brand: brandFilter,
        saree_status: sareeStatusFilter
      };
      const { data } = await sareeAPI.getAll(params);
      setSarees(data.sarees || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load sarees:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, sort, status, debouncedCompany, debouncedColor, brandFilter, sareeStatusFilter]);

  useEffect(() => {
    fetchSarees();
  }, [fetchSarees]);

  const handleRealtimeUpdate = useDebouncedCallback(() => {
    fetchSarees();
  }, 300);

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('realtime-sarees-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combinations' }, () => {
        handleRealtimeUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beams' }, () => {
        handleRealtimeUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sarees' }, () => {
        handleRealtimeUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleRealtimeUpdate]);

  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (sort !== 'newest') params.sort = sort;
    if (brandFilter) params.brand = brandFilter;
    if (sareeStatusFilter) params.saree_status = sareeStatusFilter;
    setSearchParams(params);
  }, [search, status, sort, brandFilter, sareeStatusFilter, setSearchParams]);

  const handleDeleteClick = (saree) => {
    setDeleteSareeObj(saree);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSareeObj) return;
    try {
      await sareeAPI.delete(deleteSareeObj.id);
      setDeleteOpen(false);
      setToastMessage('Saree design permanently deleted.');
      fetchSarees();
    } catch (error) {
      console.error('Failed to delete saree:', error);
    }
  };

  const handleExportExcel = () => {
    const exportData = sarees.map((s) => ({
      'Sari Name': s.sari_name,
      'Series Code': s.series_code,
      'Price': s.price != null ? s.price : '',
      'Current Stock': s.current_stock,
      'Minimum Stock': s.minimum_stock,
      'Maximum Stock': s.maximum_stock,
      'Description': s.description || '',
      'Variants':
        s.color_variants
          ?.map(
            (v) =>
              `${v.variant_number}: ${v.color_name}${
                v.company_name ? ` (${v.company_name})` : ''
              }`
          )
          .join(', ') || '',
    }));

    const worksheet = xlsxUtils.json_to_sheet(exportData);
    const workbook = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(workbook, worksheet, 'Inventory');
    xlsxWriteFile(workbook, 'Saree_Stock_Sheet.xlsx');
  };

  const totalPages = Math.ceil(total / rowsPerPage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-burgundy-900 text-white text-xs font-semibold shadow-luxury-lg animate-fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Title & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Saree Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, manage, and audit master saree series, beams, and yarn combinations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="text-xs font-semibold h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>

          {(isAdmin || isStaff) && (
            <Button
              variant="luxury"
              size="sm"
              onClick={() => navigate('/sarees/add')}
              className="text-xs font-bold h-9 shadow-luxury"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add New Saree
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Panel */}
      <Card className="border border-border shadow-luxury">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Saree, Beam, F-Color, Company, Brand…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-8 text-xs h-10 rounded-lg"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {hasAnyFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs text-destructive hover:bg-destructive/10 h-9 font-semibold"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Reset Filters
              </Button>
            )}
          </div>

          {/* Granular Filters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="newest">Sort: Newest Added</option>
              <option value="oldest">Sort: Oldest Added</option>
              <option value="stock_high">Sort: Stock High &rarr; Low</option>
              <option value="stock_low">Sort: Stock Low &rarr; High</option>
              <option value="alpha">Sort: Alphabetical</option>
            </select>

            <select
              value={sareeStatusFilter}
              onChange={(e) => setSareeStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="">Status: All Levels</option>
              <option value="In Stock">In Stock</option>
              <option value="In Delivery">In Delivery</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>

            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="">Brand: All Brands</option>
              <option value="KP">KP Creation</option>
              <option value="KPR">KPR Premium</option>
            </select>

            <Input
              placeholder="Filter by Company…"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-9 text-xs"
            />

            <Input
              placeholder="Filter by Color…"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Master Catalog Table */}
      <Card className="border border-border shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs font-bold uppercase">Product & Series</TableHead>
                <TableHead className="text-xs font-bold uppercase">Brand & Tags</TableHead>
                <TableHead className="text-xs font-bold uppercase text-right">Price</TableHead>
                <TableHead className="text-xs font-bold uppercase">Stock Level</TableHead>
                <TableHead className="text-xs font-bold uppercase">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && sarees.length === 0 ? (
                [1, 2, 3, 4, 5, 6].map((n) => (
                  <TableRow key={n}>
                    <TableCell colSpan={7} className="py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : sarees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-10 h-10 opacity-30" />
                      <span className="text-sm font-bold text-foreground">
                        No matching saree designs found.
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Try clearing or adjusting your search parameters.
                      </span>
                      {hasAnyFilter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllFilters}
                          className="mt-2 text-xs font-semibold"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sarees.map((saree) => {
                  const st = getStockStatus(saree.total_stock, saree.min_stock);
                  const sareeStatuses = Array.from(
                    new Set(
                      saree.beams?.flatMap((b) =>
                        b.combinations?.map((c) => c.status).filter(Boolean)
                      ) || []
                    )
                  );
                  const filteredBeams = getFilteredHierarchy(saree);
                  const hasBeams = saree.beams && saree.beams.length > 0;
                  const isExpanded = expandedSarees[saree.id];

                  return (
                    <Fragment key={saree.id}>
                      <TableRow
                        id={`saree-row-${saree.id}`}
                        onClick={() => navigate(`/sarees/${saree.id}`)}
                        className="cursor-pointer hover:bg-muted/30 transition-colors group"
                      >
                        {/* Expand Button */}
                        <TableCell onClick={(e) => e.stopPropagation()} className="w-10 py-3">
                          {hasBeams && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(saree.id)}
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-burgundy-900 dark:text-burgundy-300" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </TableCell>

                        {/* Product info & Thumbnail */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-lg overflow-hidden border border-border bg-muted/50 shrink-0 flex items-center justify-center">
                              {saree.image_url ||
                              saree.beams?.flatMap((b) => b.combinations || []).find((c) => c.image_url)?.image_url ? (
                                <img
                                  src={
                                    saree.image_url ||
                                    saree.beams?.flatMap((b) => b.combinations || []).find((c) => c.image_url)?.image_url
                                  }
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-lg">🧵</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-foreground group-hover:text-burgundy-900 dark:group-hover:text-burgundy-300 transition-colors truncate">
                                {renderHighlighted(saree.sari_name)}
                              </div>
                              <div className="font-mono text-[11px] font-bold text-muted-foreground mt-0.5">
                                {renderHighlighted(saree.series_code)}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Brand & Status badges */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {saree.brand && (
                              <Badge
                                variant={saree.brand === 'KP' ? 'luxury' : 'secondary'}
                                className="text-[10px] font-bold px-1.5 py-0"
                              >
                                {saree.brand}
                              </Badge>
                            )}
                            {sareeStatuses.map((s) => (
                              <Badge
                                key={s}
                                variant="outline"
                                className="text-[10px] font-medium px-1.5 py-0"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>

                        {/* Price */}
                        <TableCell className="py-3 text-right font-mono font-bold text-xs text-burgundy-900 dark:text-burgundy-300">
                          {saree.price != null
                            ? `₹${Number(saree.price).toLocaleString('en-IN')}`
                            : '—'}
                        </TableCell>

                        {/* Stock Telemetry */}
                        <TableCell className="py-3">
                          <StockBar
                            total={saree.total_stock}
                            min={saree.min_stock ?? 20}
                            max={saree.maximum_stock}
                            barClass={st.barClass}
                          />
                        </TableCell>

                        {/* Status Chip */}
                        <TableCell className="py-3">
                          <Badge variant={st.variant} className="text-[10px] font-bold px-2 py-0.5">
                            {st.label}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => navigate(`/sarees/${saree.id}`)}
                              title="View details"
                            >
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            {(isAdmin || isStaff) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => navigate(`/sarees/edit/${saree.id}`)}
                                  title="Edit saree"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDeleteClick(saree)}
                                  title="Delete saree"
                                  className="text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Collapsible Sub-Row: Beams & Combinations Hierarchy */}
                      {isExpanded && (
                        <TableRow className="bg-muted/10 border-t-0">
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-4 sm:p-5 space-y-4 bg-muted/20 border-y border-border">
                              {filteredBeams.length === 0 ? (
                                <p className="text-xs italic text-muted-foreground text-center py-2">
                                  No matching beams or combinations found for current filters.
                                </p>
                              ) : (
                                filteredBeams.map((beam) => (
                                  <div
                                    key={beam.id}
                                    className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-3"
                                  >
                                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                      <span className="text-xs font-bold uppercase tracking-wider text-burgundy-900 dark:text-burgundy-300 flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5" />
                                        Beam: {renderHighlighted(beam.beam_name)}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground font-medium">
                                        {beam.combinations?.length || 0} combinations registered
                                      </span>
                                    </div>

                                    <div className="space-y-2.5">
                                      {beam.combinations?.map((combo) => {
                                        const isHighlighted = combo.id === highlightComboId;

                                        return (
                                          <div
                                            id={`combo-row-${combo.id}`}
                                            key={combo.id}
                                            className={cn(
                                              "p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                                              isHighlighted
                                                ? "border-burgundy-900 ring-2 ring-burgundy-900/20 bg-burgundy-50/20 dark:bg-burgundy-900/10"
                                                : "border-border/60 bg-card hover:border-border"
                                            )}
                                          >
                                            {/* Left: Thumbnail & Details */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                              {combo.image_url && (
                                                <img
                                                  src={combo.image_url}
                                                  alt=""
                                                  className="w-12 h-12 rounded-md object-cover border border-border shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                                  onClick={() => navigate(`/sarees/${saree.id}`)}
                                                />
                                              )}
                                              <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-bold text-foreground">
                                                    {combo.combination_name
                                                      ? renderHighlighted(combo.combination_name)
                                                      : 'Unnamed Combination'}
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

                                                {/* F-Colors pill summary */}
                                                <div className="flex flex-wrap gap-1">
                                                  {combo.combination_colors?.map((col) => (
                                                    <span
                                                      key={col.id}
                                                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                                    >
                                                      <strong>{col.f_number}:</strong>{' '}
                                                      {renderHighlighted(col.color_name, 'color')}
                                                      {col.company_name && (
                                                        <span className="opacity-75 ml-0.5">
                                                          ({renderHighlighted(col.company_name, 'company')})
                                                        </span>
                                                      )}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Right: Stock count & WhatsApp action */}
                                            <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                                              <div className="text-left sm:text-right">
                                                <span className="font-mono text-xs font-bold text-foreground block">
                                                  {combo.current_stock ?? 0} pcs
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                  Min: {combo.minimum_stock ?? 20}
                                                </span>
                                              </div>

                                              <div className="flex items-center gap-1.5">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => openStockDialog(combo, beam, saree, 'STOCK')}
                                                  className="h-7 text-[11px] font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                                >
                                                  <MessageCircle className="w-3 h-3 mr-1" />
                                                  Request
                                                </Button>

                                                <Button
                                                  size="icon-sm"
                                                  variant="ghost"
                                                  onClick={() => navigate('/history')}
                                                  title="Audit History"
                                                  className="h-7 w-7"
                                                >
                                                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border text-xs text-muted-foreground">
          <div>
            Showing {total === 0 ? 0 : page * rowsPerPage + 1} to{' '}
            {Math.min((page + 1) * rowsPerPage, total)} of {total} registered sarees
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Prev
            </Button>
            <span className="font-semibold text-foreground px-1">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive font-serif">
              Delete Saree Design Permanently?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong className="text-foreground">{deleteSareeObj?.series_code}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2">
            <span className="font-bold block">This operation will permanently purge:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
              <li>All associated Beam architectures</li>
              <li>All yarn color combinations & F-number mappings</li>
              <li>Complete stock history & audit log entries</li>
              <li>Pending stock procurement requests</li>
              <li>Stored product image assets</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Stock Dialog */}
      <RequestStockDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        combination={requestCombo}
        beamName={requestBeamName}
        seriesCode={requestSeriesCode}
        sareeId={requestSareeId}
        initialMovementType={requestMovementType}
        onSuccess={() => {
          fetchSarees();
          setRequestDialogOpen(false);
          setToastMessage('Replenishment request dispatched via WhatsApp!');
        }}
      />
    </div>
  );
};

export default AllSarees;
