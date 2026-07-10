/**
 * Authentication Context
 * Manages user authentication state using Supabase Auth, login/logout, and role-based access
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('sari_token'));

  // Fetch the public user profile from the backend
  const fetchProfile = useCallback(async (accessToken) => {
    try {
      // Temporarily store token in localStorage so API interceptor uses it
      localStorage.setItem('sari_token', accessToken);
      const { data } = await authAPI.getMe();
      if (data && data.user) {
        setUser(data.user);
        localStorage.setItem('sari_user', JSON.stringify(data.user));
        setToken(accessToken);
      } else {
        throw new Error('No user data returned');
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      // Clean up on failure
      localStorage.removeItem('sari_token');
      localStorage.removeItem('sari_user');
      setUser(null);
      setToken(null);
    }
  }, []);

  // Monitor auth state changes from Supabase
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client is not initialized.');
      setLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await fetchProfile(session.access_token);
      } else {
        localStorage.removeItem('sari_token');
        localStorage.removeItem('sari_user');
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchProfile(session.access_token);
      } else {
        localStorage.removeItem('sari_token');
        localStorage.removeItem('sari_user');
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const login = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.session) {
      await fetchProfile(data.session.access_token);
    }
    return data;
  }, [fetchProfile]);

  const signUp = useCallback(async (email, password, fullName) => {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: email.split('@')[0],
        },
      },
    });

    if (error) throw error;

    // If confirmation is required, there won't be a session immediately
    if (data.session) {
      await fetchProfile(data.session.access_token);
    }
    return data;
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out from Supabase:', err);
      }
    }
    localStorage.removeItem('sari_token');
    localStorage.removeItem('sari_user');
    localStorage.removeItem('pending_whatsapp_import');
    localStorage.removeItem('sari_recent');
    localStorage.removeItem('sari_favorites');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const isAuthenticated = !!user && !!token;
  const isAdmin = isAuthenticated;
  const isStaff = isAuthenticated;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signUp, logout, isAdmin, isStaff, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

