const mongoose = require('mongoose');
const calculateExpiry = require('../utils/calculateExpiry');

const memberSchema = new mongoose.Schema(
  {
    photo: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits'],
    },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    age: { type: Number },
    address: { type: String },
    batch: { type: String, enum: ['morning', 'evening'], required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    admissionDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    amountPaid: { type: Number, required: true },
    paymentMode: { type: String, default: 'cash', enum: ['cash'] },
    status: { type: String, enum: ['active', 'expired'], default: 'active' },
    admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

memberSchema.index({ name: 1 });
memberSchema.index({ phone: 1 });
memberSchema.index({ admissionDate: -1 });
memberSchema.index({ expiryDate: 1 });

// Auto-calculate expiryDate whenever plan (or admissionDate) is set/changed.
memberSchema.pre('save', async function (next) {
  if (this.isModified('plan') || this.isModified('admissionDate') || this.isNew) {
    const Plan = mongoose.model('Plan');
    const plan = await Plan.findById(this.plan);
    if (plan) {
      this.expiryDate = calculateExpiry(this.admissionDate || Date.now(), plan.durationInMonths);
    }
  }
  next();
});

module.exports = mongoose.model('Member', memberSchema);
