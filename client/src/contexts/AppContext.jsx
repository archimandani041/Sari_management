/**
 * App Context - Global app state
 * Manages theme mode, recently viewed, favorites, and global search
 */
import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(localStorage.getItem('sari_theme') || 'dark');
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sari_recent') || '[]'); } catch { return []; }
  });
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sari_favorites') || '[]'); } catch { return []; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleTheme = useCallback(() => {
    setThemeMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('sari_theme', next);
      return next;
    });
  }, []);

  const addRecentlyViewed = useCallback((saree) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(s => s.id !== saree.id);
      const updated = [{ id: saree.id, sari_name: saree.sari_name, series_code: saree.series_code, image_url: saree.image_url }, ...filtered].slice(0, 10);
      sessionStorage.setItem('sari_recent', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback((sareeId) => {
    setFavorites(prev => {
      const updated = prev.includes(sareeId) ? prev.filter(id => id !== sareeId) : [...prev, sareeId];
      sessionStorage.setItem('sari_favorites', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorite = useCallback((sareeId) => favorites.includes(sareeId), [favorites]);

  return (
    <AppContext.Provider value={{
      themeMode, toggleTheme, searchOpen, setSearchOpen,
      recentlyViewed, addRecentlyViewed, favorites, toggleFavorite, isFavorite,
      sidebarOpen, setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
};
