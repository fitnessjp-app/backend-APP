const express = require('express');
const rateLimit = require('express-rate-limit');
const { downloadReceipt } = require('../controllers/receiptController');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again in a minute.',
});

router.get('/:token', limiter, downloadReceipt);

module.exports = router;
