const Member = require('../models/Member');
const Plan = require('../models/Plan');
const Payment = require('../models/Payment');
const { sendEmail } = require('../config/mailer');
const { admissionReceiptTemplate, renewalReceiptTemplate } = require('../utils/receiptEmailTemplate');
const calculateExpiry = require('../utils/calculateExpiry');
const asyncHandler = require('../utils/asyncHandler');
const { receiptSnapshot, newReceiptToken } = require('../utils/receipts');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed sort keys (never trust a raw sort string from the client).
const SORTS = {
  newest: { admissionDate: -1, _id: -1 },
  oldest: { admissionDate: 1, _id: 1 },
  expiry_soon: { expiryDate: 1, _id: 1 }, // plan ending soonest first
  expiry_late: { expiryDate: -1, _id: -1 },
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: -1 },
  amount_high: { amountPaid: -1, _id: -1 },
  amount_low: { amountPaid: 1, _id: 1 },
};

const dayStart = (str) => {
  const d = new Date(str);
  if (isNaN(d)) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};
const dayEnd = (str) => {
  const d = new Date(str);
  if (isNaN(d)) return null;
  d.setHours(23, 59, 59, 999);
  return d;
};

// POST /api/members
const createMember = asyncHandler(async (req, res) => {
  const { name, email, phone, gender, age, address, batch, plan, amountPaid, admissionDate: admissionInput } = req.body;

  const planDoc = await Plan.findById(plan);
  if (!planDoc) return res.status(400).json({ success: false, message: 'Invalid plan selected' });

  const parsed = admissionInput ? new Date(admissionInput) : null;
  const admissionDate = parsed && !isNaN(parsed) ? parsed : new Date();
  const expiryDate = calculateExpiry(admissionDate, planDoc.durationInMonths);

  const member = await Member.create({
    photo: req.file ? req.file.path : '',
    name,
    email,
    phone,
    gender: gender || undefined,
    age: age || undefined,
    address,
    batch,
    plan: planDoc._id,
    admissionDate,
    expiryDate,
    amountPaid,
    paymentMode: 'cash',
    status: expiryDate < new Date() ? 'expired' : 'active',
    admittedBy: req.admin._id,
  });

  const payment = await Payment.create({
    member: member._id,
    plan: planDoc._id,
    amount: amountPaid,
    type: 'new_admission',
    paymentMode: 'cash',
    receivedBy: req.admin._id,
    date: admissionDate,
    ...receiptSnapshot({ member, plan: planDoc, startDate: admissionDate, expiryDate }),
  });

  // Fire-and-forget: a mail failure must never block the admission.
  sendEmail({
    to: member.email,
    subject: 'Welcome to FitZone — Membership Receipt',
    html: admissionReceiptTemplate({ member, plan: planDoc }),
  }).catch((err) => console.error('Failed to send admission receipt email:', err.message));

  const populated = await member.populate('plan');
  res.status(201).json({ success: true, member: populated, receiptToken: payment.receiptToken });
});

// GET /api/members
// Query: search, status(active|expiring|expired), batch, plan, gender, admittedFrom, admittedTo,
//        expiryFrom, expiryTo, ageMin, ageMax, sort, page, limit
const getMembers = asyncHandler(async (req, res) => {
  const {
    search, status, batch, plan, gender,
    admittedFrom, admittedTo, expiryFrom, expiryTo, ageMin, ageMax,
    page = 1, limit = 20, sort = 'newest',
  } = req.query;

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Filters shared by the list and by the status counters.
  const base = {};

  if (search && String(search).trim()) {
    const term = escapeRegex(String(search).trim());
    base.$or = [
      { name: { $regex: term, $options: 'i' } },
      { phone: { $regex: term } },
      { email: { $regex: term, $options: 'i' } },
    ];
  }
  if (batch) base.batch = batch;
  if (plan) base.plan = plan;
  if (gender) base.gender = gender;

  const admitted = {};
  if (admittedFrom && dayStart(admittedFrom)) admitted.$gte = dayStart(admittedFrom);
  if (admittedTo && dayEnd(admittedTo)) admitted.$lte = dayEnd(admittedTo);
  if (Object.keys(admitted).length) base.admissionDate = admitted;

  const expiry = {};
  if (expiryFrom && dayStart(expiryFrom)) expiry.$gte = dayStart(expiryFrom);
  if (expiryTo && dayEnd(expiryTo)) expiry.$lte = dayEnd(expiryTo);
  if (Object.keys(expiry).length) base.expiryDate = expiry;

  const ageRange = {};
  if (ageMin !== undefined && ageMin !== '' && !isNaN(ageMin)) ageRange.$gte = Number(ageMin);
  if (ageMax !== undefined && ageMax !== '' && !isNaN(ageMax)) ageRange.$lte = Number(ageMax);
  if (Object.keys(ageRange).length) base.age = ageRange;

  // Status is derived from expiryDate so it is always correct (not dependent on the nightly cron).
  const withStatus = (s) => {
    const q = { ...base };
    const exp = { ...(base.expiryDate || {}) };
    if (s === 'active') {
      exp.$gte = exp.$gte && exp.$gte > now ? exp.$gte : now;
    } else if (s === 'expired') {
      exp.$lt = now;
    } else if (s === 'expiring') {
      exp.$gte = exp.$gte && exp.$gte > now ? exp.$gte : now;
      exp.$lte = exp.$lte && exp.$lte < in7Days ? exp.$lte : in7Days;
    }
    if (Object.keys(exp).length) q.expiryDate = exp;
    return q;
  };

  const query = withStatus(status);

  // "Ending soonest" means upcoming expiries — don't bury them under members expired long ago.
  if (sort === 'expiry_soon' && !status) {
    const exp = { ...(query.expiryDate || {}) };
    exp.$gte = exp.$gte && exp.$gte > now ? exp.$gte : now;
    query.expiryDate = exp;
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const sortSpec = SORTS[sort] || SORTS.newest;

  const [members, total, all, active, expiring, expired] = await Promise.all([
    Member.find(query)
      .populate('plan')
      .collation({ locale: 'en', strength: 2 })
      .sort(sortSpec)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Member.countDocuments(query),
    Member.countDocuments(withStatus('')),
    Member.countDocuments(withStatus('active')),
    Member.countDocuments(withStatus('expiring')),
    Member.countDocuments(withStatus('expired')),
  ]);

  res.json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    counts: { all, active, expiring, expired },
    members,
  });
});

// GET /api/members/:id
const getMemberById = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id).populate('plan').populate('admittedBy', 'name username');
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

  let payments = await Payment.find({ member: member._id })
    .populate('plan', 'name')
    .populate('receivedBy', 'name')
    .sort('-date');

  // Payments made before receipts existed get a token now, so they can also show a QR.
  const missing = payments.filter((p) => !p.receiptToken);
  if (missing.length) {
    await Promise.all(
      missing.map((p) => {
        p.receiptToken = newReceiptToken();
        return p.save();
      })
    );
  }

  res.json({ success: true, member, payments });
});

// PUT /api/members/:id
const updateMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

  const { name, phone, email, batch, address, gender, age } = req.body;

  if (name !== undefined) member.name = name;
  if (phone !== undefined) member.phone = phone;
  if (email !== undefined) member.email = email;
  if (batch !== undefined) member.batch = batch;
  if (address !== undefined) member.address = address;
  if (gender !== undefined) member.gender = gender || undefined;
  if (age !== undefined) member.age = age || undefined;
  if (req.file) member.photo = req.file.path;

  await member.save();
  const populated = await member.populate('plan');
  res.json({ success: true, member: populated });
});

// PUT /api/members/:id/renew
const renewMember = asyncHandler(async (req, res) => {
  const { plan, amountPaid } = req.body;

  const member = await Member.findById(req.params.id);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

  const planDoc = await Plan.findById(plan);
  if (!planDoc) return res.status(400).json({ success: false, message: 'Invalid plan selected' });

  // Still running? Extend from the current expiry so the member doesn't lose paid days.
  const now = new Date();
  const startFrom = member.expiryDate && member.expiryDate > now ? member.expiryDate : now;

  member.plan = planDoc._id;
  member.expiryDate = calculateExpiry(startFrom, planDoc.durationInMonths);
  member.amountPaid = amountPaid;
  member.status = 'active';
  await member.save();

  const payment = await Payment.create({
    member: member._id,
    plan: planDoc._id,
    amount: amountPaid,
    type: 'renewal',
    paymentMode: 'cash',
    receivedBy: req.admin._id,
    ...receiptSnapshot({ member, plan: planDoc, startDate: now, expiryDate: member.expiryDate }),
  });

  sendEmail({
    to: member.email,
    subject: 'FitZone — Membership Renewed',
    html: renewalReceiptTemplate({ member, plan: planDoc }),
  }).catch((err) => console.error('Failed to send renewal receipt email:', err.message));

  const populated = await member.populate('plan');
  res.json({ success: true, member: populated, receiptToken: payment.receiptToken });
});

// DELETE /api/members/:id  (payment history is kept for revenue accuracy)
const deleteMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

  await member.deleteOne();
  res.json({ success: true, message: 'Member deleted' });
});

module.exports = { createMember, getMembers, getMemberById, updateMember, renewMember, deleteMember };
