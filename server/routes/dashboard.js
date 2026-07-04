const express = require('express');
const router = express.Router();
const { getDashboard, getPrediction } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getDashboard);
router.get('/predict', authenticate, getPrediction);

module.exports = router;
