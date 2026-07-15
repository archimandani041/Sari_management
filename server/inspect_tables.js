require('dotenv').config();
const { supabase } = require('./config/supabase');

async function run() {
  const tables = [
    'sarees',
    'beams',
    'combinations',
    'combination_colors',
    'suppliers',
    'stock_requests',
    'stock_history',
    'settings',
    'activity_logs'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table "${table}" error:`, error.message);
      } else {
        const columns = data.length > 0 ? Object.keys(data[0]) : 'Empty table';
        console.log(`Table "${table}" exists. Columns:`, columns);
      }
    } catch (err) {
      console.log(`Table "${table}" catch:`, err.message);
    }
  }

  // Check RLS status of pg_tables
  try {
    const { data, error } = await supabase.rpc('get_table_security_status');
    if (error) {
      // Try raw query or list tables using direct sql if we can. Since we cannot run raw sql unless we have a function or rpc, let's see.
      console.log('RPC get_table_security_status failed:', error.message);
    } else {
      console.log('RLS Status:', data);
    }
  } catch (err) {
    console.log('RLS Check catch:', err.message);
  }
}

run();
