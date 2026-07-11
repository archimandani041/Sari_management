require('dotenv').config();
const { supabase } = require('./config/supabase');

async function confirmUser() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please specify the email to confirm. Example: node confirm_user.js test@example.com');
    return;
  }

  console.log(`Searching for user with email: ${email}...`);
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    const user = users.find(u => u.email === email.trim());
    if (!user) {
      console.error(`No user found with email: ${email}`);
      return;
    }

    console.log(`Found user: ${user.email} (ID: ${user.id}). Confirming...`);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true
    });

    if (updateErr) {
      console.error('Failed to confirm user:', updateErr.message);
    } else {
      console.log(`Successfully confirmed ${email}! They can now log in immediately.`);
    }
  } catch (err) {
    console.error('Error confirming user:', err.message);
  }
}

confirmUser();
