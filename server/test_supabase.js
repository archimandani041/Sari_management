require('dotenv').config();
const { supabase } = require('./config/supabase');

async function run() {
  console.log('Testing PostgREST syntax...');
  try {
    const { data: sarees } = await supabase.from('sarees').select('id').limit(2);
    const ids = (sarees || []).map(s => s.id);
    console.log('Test Saree IDs:', ids);

    if (ids.length > 0) {
      const orQuery = `beam_name.ilike.%white%,saree_id.in.(${ids.join(',')})`;
      console.log('Querying stock_history with OR:', orQuery);
      const { data, error } = await supabase
        .from('stock_history')
        .select('id, beam_name, saree_id')
        .or(orQuery)
        .limit(5);

      if (error) {
        console.error('Query failed:', error);
      } else {
        console.log('Query succeeded! Rows:', data);
      }
    } else {
      console.log('No sarees found to test.');
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
}

run();
