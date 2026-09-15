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
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('sari_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(sessionStorage.getItem('sari_token'));

  // Fetch the public user profile from the backend
  const fetchProfile = useCallback(async (accessToken, sessionUser = null) => {
    try {
      // Temporarily store token in sessionStorage so API interceptor uses it
      sessionStorage.setItem('sari_token', accessToken);
      const { data } = await authAPI.getMe();
      if (data && data.user) {
        setUser(data.user);
        sessionStorage.setItem('sari_user', JSON.stringify(data.user));
        setToken(accessToken);
        return data.user;
      } else {
        throw new Error('No user data returned from /api/auth/me');
      }
    } catch (err) {
      console.error('Failed to fetch user profile from API, checking fallback:', err);
      // If we have sessionUser from Supabase, construct fallback user
      const su = sessionUser || (await supabase?.auth?.getUser(accessToken))?.data?.user;
      if (su) {
        const fallbackUser = {
          id: su.id,
          email: su.email,
          username: su.user_metadata?.username || su.email?.split('@')[0],
          full_name: su.user_metadata?.full_name || su.email?.split('@')[0],
          role: su.user_metadata?.role || 'admin',
          created_at: su.created_at,
        };
        setUser(fallbackUser);
        sessionStorage.setItem('sari_user', JSON.stringify(fallbackUser));
        setToken(accessToken);
        return fallbackUser;
      }
      // Clean up on failure only if no valid session user exists
      sessionStorage.removeItem('sari_token');
      sessionStorage.removeItem('sari_user');
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
        await fetchProfile(session.access_token, session.user);
      } else {
        sessionStorage.removeItem('sari_token');
        sessionStorage.removeItem('sari_user');
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchProfile(session.access_token, session.user);
      } else {
        sessionStorage.removeItem('sari_token');
        sessionStorage.removeItem('sari_user');
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
      await fetchProfile(data.session.access_token, data.session.user);
    }
    return data;
  }, [fetchProfile]);

  const signUp = useCallback(async (email, password, fullName) => {
    if (!supabase) throw new Error('Supabase client not initialized');

    // emailRedirectTo MUST match a URL whitelisted in Supabase Dashboard
    // → Authentication → URL Configuration → Redirect URLs
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
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
    sessionStorage.removeItem('sari_token');
    sessionStorage.removeItem('sari_user');
    sessionStorage.removeItem('pending_whatsapp_import');
    sessionStorage.removeItem('sari_recent');
    sessionStorage.removeItem('sari_favorites');
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

