const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { ownerOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Only failed attempts count, so many admins on the same wifi don't lock each other out.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many failed login attempts. Please try again in 15 minutes.' },
});

router.post('/login', loginLimiter, auth.login);

router.use(authMiddleware);
router.get('/me', auth.getMe);
router.put('/profile', auth.updateProfile);
router.put('/password', auth.changePassword);

router.get('/admins', ownerOnly, auth.listAdmins);
router.post('/admins', ownerOnly, auth.createAdmin);
router.put('/admins/:id/password', ownerOnly, auth.resetAdminPassword);
router.delete('/admins/:id', ownerOnly, auth.deleteAdmin);

module.exports = router;
