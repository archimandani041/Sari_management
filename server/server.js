/**
 * KP Creation System - Express Server
 * Main entry point for the backend API
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - needed for express-rate-limit to correctly read req.ip
// Without this, req.ip can be undefined, causing ERR_ERL_UNDEFINED_IP_ADDRESS (500 errors)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
// Build the list of allowed origins:
// - In development: all localhost ports
// - In production: ALLOWED_ORIGINS (comma-separated) or fallback to FRONTEND_URL
const devOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];

const productionOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / curl with no origin header
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV === 'production') {
      // Allow any vercel.app preview URL belonging to this project, or any explicit allowed origin
      const isAllowed =
        productionOrigins.includes(origin) ||
        origin.endsWith('.vercel.app');
      if (isAllowed) {
        callback(null, origin);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    } else {
      if (devOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));

// Rate limiting
const isDev = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 200, // generous limit in dev, stricter in prod
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: isDev ? false : true  // skip IP validation in dev to avoid ERR_ERL_UNDEFINED_IP_ADDRESS
});
app.use('/api/', limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 20,
  message: { error: 'Too many login attempts.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: isDev ? false : true
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', (req, res, next) => {
  if (req.path.startsWith('/login') || req.path.startsWith('/register')) {
    return authLimiter(req, res, next);
  }
  next();
}, require('./routes/auth'));
app.use('/api/sarees', require('./routes/sarees'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/stock-requests', require('./routes/stockRequests'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/parser', require('./routes/parser'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const message = isDev ? (err.message || 'Internal server error') : 'Internal server error';
  res.status(500).json({ error: message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 KP Creation Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
// Force reload watcher: v2-schema-loaded

