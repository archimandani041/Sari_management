const express = require('express');
const multer = require('multer');
const http = require('http');

const app = express();
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Test 1: Direct multer middleware
router.post('/direct/:comboId', upload.single('image'), (req, res) => {
  res.json({ test: 'direct', comboId: req.params.comboId, hasFile: !!req.file });
});

// Test 2: Wrapped multer (current approach)
const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

router.post('/wrapped/:comboId', handleUpload, (req, res) => {
  res.json({ test: 'wrapped', comboId: req.params.comboId, hasFile: !!req.file });
});

// Test 3: Multi-middleware chain (like our real route)
const fakeAuth = (req, res, next) => { req.user = { role: 'admin' }; next(); };
const fakeAuthz = (req, res, next) => next();

router.post('/combination/:comboId', fakeAuth, fakeAuthz, handleUpload, (req, res) => {
  res.json({ test: 'full-chain', comboId: req.params.comboId, hasFile: !!req.file });
});

app.use('/api/upload', router);
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(9999, async () => {
  console.log('Test server on 9999');
  
  const tests = [
    '/api/upload/direct/abc123',
    '/api/upload/wrapped/abc123',
    '/api/upload/combination/abc123',
  ];

  for (const path of tests) {
    await new Promise((resolve) => {
      const req = http.request(
        { hostname: 'localhost', port: 9999, path, method: 'POST' },
        (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            console.log(`  ${path} => ${res.statusCode}: ${d}`);
            resolve();
          });
        }
      );
      req.end();
    });
  }

  server.close();
  process.exit(0);
});
