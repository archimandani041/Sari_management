const express = require('express');
const router = express.Router();
const { login, logout, getMe, register } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/register', authenticate, authorize('admin'), register);

module.exports = router;
