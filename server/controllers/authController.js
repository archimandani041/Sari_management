/**
 * Authentication Controller
 * Handles login, logout, and user session management
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .eq('is_active', true)
      .limit(1);

    if (error) throw error;

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token (24 hour expiry)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      user_name: user.full_name,
      action: 'LOGIN',
      entity_type: 'auth',
      details: { ip: req.ip }
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/auth/logout
 * Log user logout activity
 */
const logout = async (req, res) => {
  try {
    await supabase.from('activity_logs').insert({
      user_id: req.user.id,
      user_name: req.user.full_name,
      action: 'LOGOUT',
      entity_type: 'auth'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/auth/me
 * Get current user profile
 */
const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, full_name, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.json({ user });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/auth/register
 * Register a new user (admin only)
 */
const register = async (req, res) => {
  try {
    const { username, email, password, role, full_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create user in Supabase Auth using the admin API (Service Role)
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm since it's created by admin
      user_metadata: {
        username: username || email.split('@')[0],
        full_name: full_name || ''
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const authUser = data.user;

    // Create public profile
    const { data: user, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        username: (username || email.split('@')[0]).toLowerCase().trim(),
        email,
        password_hash: 'supabase_managed',
        role: role || 'staff',
        full_name: full_name || '',
        is_active: true
      })
      .select('id, username, email, role, full_name')
      .single();

    if (dbError) {
      // If public record fails, clean up the auth user to avoid orphan auth state
      await supabase.auth.admin.deleteUser(authUser.id);
      if (dbError.code === '23505') {
        return res.status(400).json({ error: 'Username or email already exists in system' });
      }
      throw dbError;
    }

    res.status(201).json({ user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


module.exports = { login, logout, getMe, register };
