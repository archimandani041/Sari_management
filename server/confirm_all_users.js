require('dotenv').config();
const { supabase } = require('./config/supabase');

async function confirmAllUsers() {
  console.log('Fetching users from auth.users...');
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Failed to list auth users:', error.message);
      return;
    }

    console.log(`Found ${data.users.length} users in auth.users.`);
    for (const user of data.users) {
      if (!user.email_confirmed_at) {
        console.log(`Confirming email for ${user.email} (ID: ${user.id})...`);
        const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
          email_confirm: true
        });
        if (updateErr) {
          console.error(`Failed to confirm ${user.email}:`, updateErr.message);
        } else {
          console.log(`Successfully confirmed ${user.email}!`);
        }
      } else {
        console.log(`${user.email} is already confirmed.`);
      }
    }
  } catch (err) {
    console.error('An error occurred:', err.message);
  }
}

confirmAllUsers();
