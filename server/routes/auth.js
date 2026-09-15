const express = require('express');
const router = express.Router();
const { login, logout, getMe, register, getUsers } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, authorize('admin'), getUsers);
router.post('/register', authenticate, authorize('admin'), register);

module.exports = router;
