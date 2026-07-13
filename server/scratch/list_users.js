require('dotenv').config();
const { supabase } = require('../config/supabase');

async function listUsers() {
  const { data: users, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users in public.users:', users);
  }
  
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Error listing auth users:', authError);
    } else {
      console.log('Auth users count:', authUsers.users?.length);
      authUsers.users?.forEach(u => {
        console.log(`- Email: ${u.email}, ID: ${u.id}, Metadata:`, u.user_metadata);
      });
    }
  } catch (e) {
    console.error('Failed to query auth.users:', e);
  }
}

listUsers();
