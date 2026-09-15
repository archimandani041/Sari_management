/**
 * Global Search Dialog (Ctrl+K)
 * Real-time instant search overlay
 * Redesigned with shadcn/ui & Tailwind CSS
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { sareeAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Dialog,
  DialogContent,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { Search, Loader2, Shirt, ArrowRight, Layers } from 'lucide-react';

const GlobalSearchDialog = () => {
  const { searchOpen, setSearchOpen } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await sareeAPI.getAll({ search: debouncedQuery, limit: 10 });
        setResults(data.sarees || []);
      } catch (error) {
        console.error('Failed to perform search:', error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSearchOpen(false);
  };

  const handleItemClick = (id) => {
    handleClose();
    navigate(`/sarees/${id}`);
  };

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden shadow-luxury-lg rounded-2xl border-border bg-card">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border gap-3">
          <Search className="w-5 h-5 text-burgundy-900 dark:text-burgundy-300 shrink-0" />
          <input
            type="text"
            placeholder="Search by saree name, series code, F-color, weaver company..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent border-0 outline-hidden text-sm text-foreground placeholder:text-muted-foreground focus:ring-0"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Type to instantly search across all series codes, beams, and yarn combinations...
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-muted-foreground space-y-1">
              <p className="text-sm font-semibold text-foreground">No sarees found</p>
              <p className="text-xs">No catalog item matches "{query}"</p>
            </div>
          ) : (
            results.map((saree) => {
              const stock = saree.total_stock ?? saree.current_stock ?? 0;
              const min = saree.min_stock ?? saree.minimum_stock ?? 20;
              const isLow = stock <= min;
              const isOut = stock === 0;

              return (
                <button
                  key={saree.id}
                  type="button"
                  onClick={() => handleItemClick(saree.id)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                      {saree.image_url ? (
                        <img src={saree.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Shirt className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground group-hover:text-burgundy-900 dark:group-hover:text-burgundy-300 transition-colors truncate">
                          {saree.sari_name || 'Design'}
                        </span>
                        <Badge variant="luxury" className="text-[10px] font-mono px-1.5 py-0">
                          {saree.series_code}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-muted-foreground truncate">
                        {saree.brand ? `${saree.brand} Brand &bull; ` : ''}
                        {saree.beams?.length ? `${saree.beams.length} Beams` : 'Standard Series'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span
                        className={cn(
                          "font-mono text-xs font-bold block",
                          isOut ? "text-destructive" : isLow ? "text-amber-600" : "text-emerald-600"
                        )}
                      >
                        {stock} pcs
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearchDialog;
