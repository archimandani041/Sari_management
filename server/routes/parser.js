const express = require('express');
const router = express.Router();
const { parseWhatsAppMessage, handleWhatsAppWebhook } = require('../controllers/parserController');
const { authenticate } = require('../middleware/auth');

router.post('/whatsapp', authenticate, parseWhatsAppMessage);
router.post('/whatsapp-webhook', handleWhatsAppWebhook);

module.exports = router;
