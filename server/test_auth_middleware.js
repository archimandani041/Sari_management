require('dotenv').config();
const { supabase } = require('./config/supabase');

async function testSelfHealing() {
  const targetAuthId = '48dcd551-0bf0-47d1-a8bc-6cc1f031599f'; // 23it056@charusat.edu.in

  console.log(`Simulating self-healing check for auth user ID: ${targetAuthId}`);

  // Get user details from auth.users (acting as authUser from token)
  const { data: { user: authUser }, error: getErr } = await supabase.auth.admin.getUserById(targetAuthId);
  if (getErr || !authUser) {
    console.error('Failed to get auth user:', getErr?.message);
    return;
  }

  console.log('Found auth user details:', {
    id: authUser.id,
    email: authUser.email,
    metadata: authUser.user_metadata
  });

  // Run the same check/self-healing logic from server/middleware/auth.js:
  let { data: user, error: dbError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (dbError) {
    console.error('Error fetching user from database:', dbError.message);
    return;
  }

  console.log('Current public.users database record:', user);

  if (!user) {
    console.log('User not found in public.users. Starting self-healing creation...');
    const email = authUser.email;
    const metadata = authUser.user_metadata || {};
    const full_name = metadata.full_name || '';
    const username = metadata.username || email.split('@')[0];

    // Check count of users
    const { count, error: countErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.error('Error counting public users:', countErr.message);
      return;
    }

    const role = (count === 0) ? 'admin' : 'staff';
    console.log(`Calculated role for user: ${role} (current count: ${count})`);

    const insertData = {
      id: authUser.id,
      username: username.toLowerCase().trim(),
      email,
      password_hash: 'supabase_managed',
      role,
      full_name,
      is_active: true
    };

    console.log('Inserting into public.users with data:', insertData);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(insertData)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating public user profile:', insertError.message, insertError);
    } else {
      console.log('Successfully created public user profile!', newUser);
    }
  } else {
    console.log('User already has a public profile.');
  }
}

testSelfHealing();
