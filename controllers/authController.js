const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');

const publicAdmin = (a) => ({
  id: a._id,
  name: a.name,
  username: a.username,
  role: a.role,
  createdAt: a.createdAt,
  lastLoginAt: a.lastLoginAt,
});

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// POST /api/auth/login  (public — there is no register route; admins are created by an owner)
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return fail(res, 400, 'Username and password are required');

  const admin = await Admin.findOne({ username: String(username).toLowerCase().trim() }).select('+password');
  if (!admin || !(await admin.matchPassword(String(password)))) {
    return fail(res, 401, 'Invalid username or password');
  }

  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });

  res.json({ success: true, token: generateToken(admin._id, admin.role), admin: publicAdmin(admin) });
});

// GET /api/auth/me — used on app start to confirm the stored token is still valid.
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, admin: publicAdmin(req.admin) });
});

// PUT /api/auth/profile — change own name / username
const updateProfile = asyncHandler(async (req, res) => {
  const { name, username } = req.body;
  const admin = await Admin.findById(req.admin._id);

  if (name !== undefined) {
    if (!String(name).trim()) return fail(res, 400, 'Name cannot be empty');
    admin.name = String(name).trim();
  }
  if (username !== undefined) {
    const u = String(username).toLowerCase().trim();
    if (u !== admin.username) {
      if (await Admin.exists({ username: u })) return fail(res, 409, 'This username is already taken');
      admin.username = u;
    }
  }

  await admin.save();
  res.json({ success: true, admin: publicAdmin(admin) });
});

// PUT /api/auth/password — change own password (needs the current one)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return fail(res, 400, 'Current and new password are required');
  if (String(newPassword).length < 8) return fail(res, 400, 'New password must be at least 8 characters');

  const admin = await Admin.findById(req.admin._id).select('+password');
  if (!(await admin.matchPassword(String(currentPassword)))) {
    return fail(res, 401, 'Current password is incorrect');
  }

  admin.password = String(newPassword);
  await admin.save();

  // Old tokens are now invalid, so hand back a fresh one to keep this device logged in.
  res.json({ success: true, message: 'Password updated', token: generateToken(admin._id, admin.role) });
});

// ---------- Owner-only: manage the admin list ----------

// GET /api/auth/admins
const listAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find().sort('createdAt');
  res.json({ success: true, admins: admins.map(publicAdmin) });
});

// POST /api/auth/admins
const createAdmin = asyncHandler(async (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password) return fail(res, 400, 'Name, username and password are required');
  if (String(password).length < 8) return fail(res, 400, 'Password must be at least 8 characters');

  const u = String(username).toLowerCase().trim();
  if (await Admin.exists({ username: u })) return fail(res, 409, 'This username is already taken');

  const admin = await Admin.create({
    name: String(name).trim(),
    username: u,
    password: String(password),
    role: role === 'owner' ? 'owner' : 'admin',
    createdBy: req.admin._id,
  });
  res.status(201).json({ success: true, admin: publicAdmin(admin) });
});

// PUT /api/auth/admins/:id/password — owner resets someone's password
const resetAdminPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 8) return fail(res, 400, 'Password must be at least 8 characters');

  const admin = await Admin.findById(req.params.id).select('+password');
  if (!admin) return fail(res, 404, 'Admin not found');

  admin.password = String(newPassword);
  await admin.save();
  res.json({ success: true, message: `Password reset for ${admin.username}` });
});

// DELETE /api/auth/admins/:id
const deleteAdmin = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) return fail(res, 404, 'Admin not found');
  if (String(admin._id) === String(req.admin._id)) return fail(res, 400, 'You cannot delete your own account');

  if (admin.role === 'owner' && (await Admin.countDocuments({ role: 'owner' })) <= 1) {
    return fail(res, 400, 'At least one owner must remain');
  }

  await admin.deleteOne();
  res.json({ success: true, message: 'Admin deleted' });
});

module.exports = {
  login,
  getMe,
  updateProfile,
  changePassword,
  listAdmins,
  createAdmin,
  resetAdminPassword,
  deleteAdmin,
};
