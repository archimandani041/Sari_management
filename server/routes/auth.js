const express = require('express');
const router = express.Router();
const { login, logout, getMe, register } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/register', authenticate, authorize('admin'), register);

router.get('/debug-env', (req, res) => {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const getRole = (key) => {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
      return payload.role;
    } catch (e) {
      return 'error: ' + e.message;
    }
  };

  res.json({
    url: url ? url.substring(0, 20) + '...' : 'missing',
    hasAnon: !!anon,
    anonRole: anon ? getRole(anon) : 'missing',
    hasService: !!service,
    serviceRole: service ? getRole(service) : 'missing',
  });
});

module.exports = router;
