require('dotenv').config();
const { supabase } = require('./config/supabase');

const ownerId = '4f8db9f9-d653-4874-bf83-fcf30c4876b0'; // Let's try to query first to see if we can get a valid owner_id or just query without owner_id filter.

async function check() {
  console.log('Checking sarees for owner_id...');
  const { error: sareesErr } = await supabase.from('sarees').select('owner_id').limit(1);
  console.log('sarees.owner_id error:', sareesErr ? sareesErr.message : 'No error (column exists)');

  console.log('Checking suppliers for owner_id...');
  const { error: suppliersErr } = await supabase.from('suppliers').select('owner_id').limit(1);
  console.log('suppliers.owner_id error:', suppliersErr ? suppliersErr.message : 'No error (column exists)');

  console.log('Checking stock_history for owner_id...');
  const { error: histErr } = await supabase.from('stock_history').select('owner_id').limit(1);
  console.log('stock_history.owner_id error:', histErr ? histErr.message : 'No error (column exists)');

  console.log('Checking if stock_requests table exists and has owner_id...');
  const { error: reqErr } = await supabase.from('stock_requests').select('owner_id').limit(1);
  console.log('stock_requests.owner_id error:', reqErr ? reqErr.message : 'No error (table and column exist)');
}

check();
