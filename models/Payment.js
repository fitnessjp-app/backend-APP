const mongoose = require('mongoose');

// Simple internal cash ledger entry — NOT a payment gateway record.
// No transaction ID, gateway status, or webhook data is stored here.
const paymentSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['new_admission', 'renewal'], required: true },
  paymentMode: { type: String, default: 'cash', enum: ['cash'] },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  date: { type: Date, default: Date.now },
  // Public, unguessable token used by the receipt QR code (no login needed to download the PDF).
  receiptToken: { type: String, unique: true, sparse: true },
  // Snapshot at payment time so the receipt stays correct even if the member/plan changes or is deleted.
  memberName: { type: String },
  memberPhone: { type: String },
  planName: { type: String },
  durationInMonths: { type: Number },
  startDate: { type: Date },
  expiryDate: { type: Date },
});

module.exports = mongoose.model('Payment', paymentSchema);
