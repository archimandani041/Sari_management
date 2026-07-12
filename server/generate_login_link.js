/**
 * Generate a magic login link for a user bypassing password.
 * Usage: node generate_login_link.js user@email.com
 */
require('dotenv').config();
const { supabase } = require('./config/supabase');

async function generateLoginLink() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node generate_login_link.js user@email.com');
    return;
  }

  console.log(`Generating magic login link for: ${email}...`);
  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email.trim(),
      options: {
        redirectTo: 'https://sari-management.vercel.app/auth/callback'
      }
    });

    if (error) throw error;

    console.log('\n✅ Magic Login Link (valid for 60 minutes):');
    console.log('─'.repeat(60));
    console.log(data.properties?.action_link || data.action_link);
    console.log('─'.repeat(60));
    console.log('\n👆 Open this link in your browser to log in directly without a password.');
    console.log('   After logging in, go to Settings to change your password.\n');
  } catch (err) {
    console.error('Error generating link:', err.message);
  }
}

generateLoginLink();
