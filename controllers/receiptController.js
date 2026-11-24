const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const generateReceiptPdf = require('../utils/generateReceiptPdf');

// GET /api/receipts/:token   (PUBLIC — the member scans the QR on their phone)
// Streams the PDF as a download. The token is a 48-char random string, so it can't be guessed.
const downloadReceipt = asyncHandler(async (req, res) => {
  const token = String(req.params.token || '');
  if (!/^[a-f0-9]{48}$/.test(token)) return res.status(404).send('Receipt not found');

  const payment = await Payment.findOne({ receiptToken: token })
    .populate('member', 'name phone expiryDate')
    .populate('plan', 'name durationInMonths')
    .populate('receivedBy', 'name');

  if (!payment) return res.status(404).send('Receipt not found');

  const receiptNo = `FZ-${String(payment._id).slice(-6).toUpperCase()}`;

  const doc = generateReceiptPdf({
    gymName: process.env.GYM_NAME || 'FitZone',
    gymAddress: process.env.GYM_ADDRESS || '',
    gymPhone: process.env.GYM_PHONE || '',
    receiptNo,
    type: payment.type,
    date: payment.date,
    memberName: payment.memberName || payment.member?.name,
    memberPhone: payment.memberPhone || payment.member?.phone,
    planName: payment.planName || payment.plan?.name,
    durationInMonths: payment.durationInMonths || payment.plan?.durationInMonths,
    expiryDate: payment.expiryDate || payment.member?.expiryDate,
    amount: payment.amount,
    receivedBy: payment.receivedBy?.name,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${receiptNo}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  doc.pipe(res);
});

module.exports = { downloadReceipt };
