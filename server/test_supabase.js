require('dotenv').config();
const { supabase } = require('./config/supabase');

async function run() {
  console.log('Testing Supabase...');
  try {
    // Let's try to query the combinations table to check its columns
    const { data, error } = await supabase
      .from('combinations')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching combinations:', error);
      return;
    }
    console.log('Successfully connected! Combination row:', data);

    // Let's check if we can run an RPC to alter the table.
    // Sometimes there might be a function to run raw SQL.
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
      sql_string: 'ALTER TABLE combinations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'In Stock\' CHECK (status IN (\'In Stock\', \'In Delivery\'));'
    });

    if (rpcError) {
      console.log('rpc("exec_sql") not available or failed:', rpcError.message);
    } else {
      console.log('rpc("exec_sql") succeeded:', rpcData);
    }
  } catch (err) {
    console.error('Catch error:', err);
  }
}

run();
