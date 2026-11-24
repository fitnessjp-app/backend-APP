const Member = require('../models/Member');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Overview stats
// @route   GET /api/analytics/overview
// @access  Private
const getOverview = asyncHandler(async (req, res) => {
  const now = new Date();
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    totalMembers,
    morningBatchCount,
    eveningBatchCount,
    activeCount,
    expiredCount,
    expiringSoonCount,
    revenueAgg,
  ] = await Promise.all([
    Member.countDocuments({}),
    Member.countDocuments({ batch: 'morning' }),
    Member.countDocuments({ batch: 'evening' }),
    Member.countDocuments({ expiryDate: { $gte: now } }),
    Member.countDocuments({ expiryDate: { $lt: now } }),
    Member.countDocuments({ expiryDate: { $gte: now, $lte: in7Days } }),
    Payment.aggregate([
      { $match: { date: { $gte: startOfMonth, $lt: startOfNextMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    totalMembers,
    morningBatchCount,
    eveningBatchCount,
    activeCount,
    expiredCount,
    expiringSoonCount,
    currentMonthRevenue: revenueAgg[0]?.total || 0,
  });
});

// @desc    Revenue over time (monthly), for charting
// @route   GET /api/analytics/revenue?range=6m
// @access  Private
const getRevenue = asyncHandler(async (req, res) => {
  const range = req.query.range || '6m';
  const months = parseInt(range.replace('m', ''), 10) || 6;

  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const data = await Payment.aggregate([
    { $match: { date: { $gte: start } } },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        revenue: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const result = data.map((d) => ({
    month: `${monthNames[d._id.month - 1]} ${d._id.year}`,
    revenue: d.revenue,
  }));

  res.json({ success: true, revenue: result });
});

// @desc    Revenue grouped by plan
// @route   GET /api/analytics/revenue-by-plan
// @access  Private
const getRevenueByPlan = asyncHandler(async (req, res) => {
  const data = await Payment.aggregate([
    {
      $group: {
        _id: '$plan',
        totalRevenue: { $sum: '$amount' },
      },
    },
    {
      $lookup: {
        from: 'plans',
        localField: '_id',
        foreignField: '_id',
        as: 'planInfo',
      },
    },
    { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        planName: { $ifNull: ['$planInfo.name', 'Deleted Plan'] },
        totalRevenue: 1,
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  res.json({ success: true, revenueByPlan: data });
});

// @desc    Recent admissions
// @route   GET /api/analytics/recent-admissions?limit=10
// @access  Private
const getRecentAdmissions = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  const members = await Member.find({})
    .sort('-admissionDate')
    .limit(limit)
    .populate('plan', 'name');

  res.json({ success: true, members });
});

module.exports = { getOverview, getRevenue, getRevenueByPlan, getRecentAdmissions };
