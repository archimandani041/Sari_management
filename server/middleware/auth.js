/**
 * JWT/Supabase Authentication Middleware
 * Verifies JWT tokens and attaches user data to request
 */
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'sari_stock_jwt_secret';

/**
 * Authenticate middleware - verifies Supabase JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Call Supabase API to get user info from the token
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authUser) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    // Find the user's role and details in public.users table
    let { data: user, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (dbError) {
      console.error('Error fetching user from database:', dbError);
      return res.status(500).json({ error: 'Internal server error checking user.' });
    }

    // Self-healing: if the user exists in auth.users but not in public.users, create it
    if (!user) {
      const email = authUser.email;
      const metadata = authUser.user_metadata || {};
      const full_name = metadata.full_name || '';
      const username = metadata.username || email.split('@')[0];

      // Check number of users to determine if they are the first user (make them admin)
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const role = (count === 0) ? 'admin' : 'staff';

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          username: username.toLowerCase().trim(),
          email,
          password_hash: 'supabase_managed',
          role,
          full_name,
          is_active: true
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating public user profile:', insertError);
        return res.status(500).json({ error: 'Error creating user profile.' });
      }
      user = newUser;
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated.' });
    }

    // Attach to request
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};


/**
 * Authorize middleware - checks user role
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    next();
  };
};

module.exports = { authenticate, authorize, JWT_SECRET };
