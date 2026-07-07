/**
 * Supabase Configuration
 * Initializes the Supabase client for database and storage operations
 */
const { createClient } = require('@supabase/supabase-js');

const cleanEnvVar = (val) => {
  if (!val) return val;
  return val.trim().replace(/^['"]|['"]$/g, '');
};

const supabaseUrl = cleanEnvVar(process.env.SUPABASE_URL);
const supabaseServiceKey = cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnonKey = cleanEnvVar(process.env.SUPABASE_ANON_KEY);

const isValidUrl = (url) => {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
};

// Decode a Supabase JWT key's `role` claim (anon | service_role) without verifying signature
const getKeyRole = (key) => {
  try {
    const cleanKey = cleanEnvVar(key);
    const payload = JSON.parse(Buffer.from(cleanKey.split('.')[1], 'base64').toString());
    return payload.role;
  } catch {
    return null;
  }
};

if (!isValidUrl(supabaseUrl) || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials not configured or invalid. Using mock mode.');
}

// Guard against the common mistake of pasting the anon key as the service role key.
// The backend relies on the service_role key to bypass RLS; using the anon key makes
// every privileged query silently return zero rows (e.g. login always fails with 401).
if (supabaseServiceKey) {
  const role = getKeyRole(supabaseServiceKey);
  if (role !== 'service_role') {
    console.error(
      `\n❌ SUPABASE_SERVICE_ROLE_KEY has role "${role || 'unknown'}", expected "service_role".\n` +
      '   The backend cannot bypass Row Level Security with this key, so queries against\n' +
      '   protected tables (users, sarees, ...) will return NO rows and login will 401.\n' +
      '   Fix: copy the real service_role key from Supabase Dashboard → Project Settings →\n' +
      '   API → Project API keys → "service_role" into server/.env.\n'
    );
  }
}

// Service role client for backend operations (bypasses RLS)
const supabase = isValidUrl(supabaseUrl) && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

// Anon client for client-facing operations
const supabaseAnon = isValidUrl(supabaseUrl) && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

module.exports = { supabase, supabaseAnon };
