require('dotenv').config();
const { supabase } = require('./config/supabase');

async function check() {
  console.log('Querying combinations columns...');
  const { data, error } = await supabase
    .from('combinations')
    .select('id, status, brand')
    .limit(1);

  if (error) {
    console.error('Error fetching status/brand:', error);
  } else {
    console.log('Query succeeded! status and brand exist.');
  }

  // Also query what columns are returned from postgrest by doing a query on information_schema if allowed, or listing the keys of a blank select
  const { data: cols, error: colError } = await supabase
    .rpc('get_table_columns', { table_name: 'combinations' });
  
  if (colError) {
    console.log('RPC get_table_columns failed (expected if not exists), let us print table structure by selecting first object:', colError.message);
  } else {
    console.log('Columns:', cols);
  }
}

check();
