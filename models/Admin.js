const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9._]{3,30}$/, 'Username: 3-30 characters, only a-z, 0-9, dot and underscore'],
    },
    password: { type: String, required: true, select: false },
    // 'owner' can add/remove admins. 'admin' can use everything else + manage own profile.
    role: { type: String, enum: ['owner', 'admin'], default: 'admin' },
    passwordChangedAt: { type: Date },
    lastLoginAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // Any token issued before this moment becomes invalid.
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

adminSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
