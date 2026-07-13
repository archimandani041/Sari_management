const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const anonKey = process.env.SUPABASE_ANON_KEY;
const jwtSecret = process.env.JWT_SECRET;

console.log('Anon Key exists:', !!anonKey);
console.log('JWT Secret exists:', !!jwtSecret);

try {
  const decoded = jwt.verify(anonKey, jwtSecret);
  console.log('Verification Success:', decoded);
} catch (err) {
  console.error('Verification Failed:', err.message);
}
