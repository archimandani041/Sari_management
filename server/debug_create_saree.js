const dotenv = require('dotenv');
dotenv.config();
const { supabase } = require('./config/supabase');
const { createSaree } = require('./controllers/sareeController');

async function test() {
  try {
    // 1. Get a real user ID
    const { data: users, error: userError } = await supabase.from('users').select('id, full_name').limit(1);
    if (userError) throw userError;
    if (!users || users.length === 0) {
      console.error('No users found in database! Cannot run test because created_by is a foreign key.');
      return;
    }
    const user = users[0];
    console.log('Testing with user:', user);

    // 2. Build mock request
    const req = {
      body: {
        series_base: 'KS526',
        series_letter: 'D',
        sari_name: '',
        description: '',
        price: null,
        image_url: '',
        beams: [
          {
            beam_name: 'White',
            combinations: [
              {
                combination_name: 'urgent Delivery',
                current_stock: 99,
                notes: '',
                colors: [
                  {
                    f_number: 'F-1',
                    color_name: 'White',
                    company_name: ''
                  }
                ]
              }
            ]
          }
        ]
      },
      user: {
        id: user.id,
        full_name: user.full_name || 'Admin User'
      }
    };

    // 3. Build mock response
    const res = {
      status: function(code) {
        console.log('Response Status:', code);
        return this;
      },
      json: function(data) {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
        return this;
      }
    };

    console.log('Calling createSaree...');
    await createSaree(req, res);
  } catch (err) {
    console.error('Caught error during execution:', err);
  }
}

test();
