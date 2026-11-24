const Plan = require('../models/Plan');
const Member = require('../models/Member');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/plans
const createPlan = asyncHandler(async (req, res) => {
  const { name, durationInMonths, price, features, isActive } = req.body;
  const plan = await Plan.create({ name, durationInMonths, price, features, isActive });
  res.status(201).json({ success: true, plan });
});

// GET /api/plans  — all plans + how many members are on each
const getPlans = asyncHandler(async (req, res) => {
  const [plans, counts] = await Promise.all([
    Plan.find().sort('-createdAt').lean(),
    Member.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json({
    success: true,
    plans: plans.map((p) => ({ ...p, memberCount: countMap.get(String(p._id)) || 0 })),
  });
});

// PUT /api/plans/:id
const updatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

  const { name, durationInMonths, price, features, isActive } = req.body;
  if (name !== undefined) plan.name = name;
  if (durationInMonths !== undefined) plan.durationInMonths = durationInMonths;
  if (price !== undefined) plan.price = price;
  if (features !== undefined) plan.features = features;
  if (isActive !== undefined) plan.isActive = isActive;

  await plan.save();
  res.json({ success: true, plan });
});

// DELETE /api/plans/:id — permanent delete, only if nobody ever used the plan.
// Used plans can't be deleted (members/payments point at them) — deactivate instead.
const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

  const [members, payments] = await Promise.all([
    Member.countDocuments({ plan: plan._id }),
    Payment.countDocuments({ plan: plan._id }),
  ]);

  if (members > 0 || payments > 0) {
    return res.status(409).json({
      success: false,
      code: 'PLAN_IN_USE',
      message: `This plan is used by ${members} member(s) / ${payments} payment(s). Deactivate it instead of deleting.`,
    });
  }

  await plan.deleteOne();
  res.json({ success: true, message: 'Plan deleted' });
});

module.exports = { createPlan, getPlans, updatePlan, deletePlan };
