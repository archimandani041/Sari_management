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
    
    // Verify Supabase JWT token locally to avoid slow network requests
    let authUser;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      authUser = {
        id: decoded.sub,
        email: decoded.email,
        user_metadata: decoded.user_metadata || {}
      };
    } catch (jwtError) {
      console.warn('Local JWT verification failed, falling back to Supabase API:', jwtError.message);
      const { data: { user: apiUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !apiUser) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      }
      authUser = apiUser;
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

    // Self-healing: if the user exists in public.users but has role 'staff' (due to DB default trigger insertion)
    // and is not the seed staff account, promote them to 'admin' to ensure strict data isolation.
    if (user && user.role === 'staff' && user.email !== 'staff@saristockmanager.com') {
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', user.id)
        .select('*')
        .single();

      if (!updateError && updatedUser) {
        user = updatedUser;
      } else {
        console.error('Failed to self-heal user role to admin:', updateError);
      }
    }

    // Self-healing: if the user exists in auth.users but not in public.users, create it
    if (!user) {
      const email = authUser.email;
      const metadata = authUser.user_metadata || {};
      const full_name = metadata.full_name || '';
      const username = metadata.username || email.split('@')[0];
      // Default to admin for new self-registrations, so each new user gets their own tenant workspace.
      // Set to staff only if explicitly registering a seed staff account.
      const isSeedStaff = email === 'staff@saristockmanager.com';
      const role = isSeedStaff ? 'staff' : 'admin';

      // Find the effective owner_id for this new user.
      let resolvedOwnerId = authUser.id; // Default: user is self-owned (admin)
      if (role === 'staff') {
        const { data: ownerRecord } = await supabase
          .from('users')
          .select('id, owner_id')
          .not('owner_id', 'is', null)
          .limit(1)
          .maybeSingle();

        if (ownerRecord?.owner_id) {
          resolvedOwnerId = ownerRecord.owner_id;
        } else if (ownerRecord?.id) {
          // owner_id column doesn't exist yet — fall back to sarees table
          const { data: sareeOwner } = await supabase
            .from('sarees')
            .select('owner_id')
            .not('owner_id', 'is', null)
            .limit(1)
            .maybeSingle();
          if (sareeOwner?.owner_id) {
            resolvedOwnerId = sareeOwner.owner_id;
          }
        }
      }

      // Try inserting with owner_id (requires migration to have been run)
      let insertResult = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          username: username.toLowerCase().trim(),
          email,
          password_hash: 'supabase_managed',
          role,
          full_name,
          is_active: true,
          owner_id: resolvedOwnerId
        })
        .select('*')
        .single();

      // If owner_id column doesn't exist yet, retry without it
      if (insertResult.error && (insertResult.error.code === '42703' || insertResult.error.message?.includes('owner_id'))) {
        insertResult = await supabase
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
      }

      if (insertResult.error) {
        console.error('Error creating public user profile:', insertResult.error);
        return res.status(500).json({ error: 'Error creating user profile.' });
      }
      user = insertResult.data;
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated.' });
    }
    // Resolve effective owner_id for data scoping:
    // - If user.owner_id is set → they're a staff member scoped to that owner's data
    // - If user.owner_id is null/missing → resolve from sarees table (legacy support, ONLY for staff users)
    // - Fallback → use user's own id
    let effectiveOwnerId = user.owner_id || user.id;

    // Legacy fallback: ONLY for staff users, if owner_id column doesn't exist in users table, check sarees
    if (user.role === 'staff' && !user.owner_id) {
      const { data: sareeOwner } = await supabase
        .from('sarees')
        .select('owner_id')
        .not('owner_id', 'is', null)
        .limit(1)
        .maybeSingle();

      if (sareeOwner?.owner_id) {
        effectiveOwnerId = sareeOwner.owner_id;
      }
    }
    // Attach to request
    req.user = {
      id: user.id,
      owner_id: effectiveOwnerId, // ← All controllers should use this for data scoping
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
