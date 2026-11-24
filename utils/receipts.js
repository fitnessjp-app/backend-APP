const crypto = require('crypto');

const newReceiptToken = () => crypto.randomBytes(24).toString('hex');

// Fields copied onto the Payment so a receipt never changes later.
const receiptSnapshot = ({ member, plan, startDate, expiryDate }) => ({
  receiptToken: newReceiptToken(),
  memberName: member.name,
  memberPhone: member.phone,
  planName: plan.name,
  durationInMonths: plan.durationInMonths,
  startDate,
  expiryDate,
});

module.exports = { newReceiptToken, receiptSnapshot };
