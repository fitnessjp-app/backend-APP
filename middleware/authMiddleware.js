const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const asyncHandler = require('../utils/asyncHandler');

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired, please login again' });
  }

  const admin = await Admin.findById(decoded.id);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'Not authorized, admin not found' });
  }

  // Password changed after this token was issued -> force re-login.
  if (admin.passwordChangedAt && decoded.iat * 1000 < admin.passwordChangedAt.getTime()) {
    return res.status(401).json({ success: false, message: 'Password was changed, please login again' });
  }

  req.admin = admin;
  next();
});

const ownerOnly = (req, res, next) => {
  if (req.admin?.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Only an owner can do this' });
  }
  next();
};

module.exports = authMiddleware;
module.exports.ownerOnly = ownerOnly;
