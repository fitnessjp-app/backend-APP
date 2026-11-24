const express = require('express');
const {
  getOverview,
  getRevenue,
  getRevenueByPlan,
  getRecentAdmissions,
} = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/overview', getOverview);
router.get('/revenue', getRevenue);
router.get('/revenue-by-plan', getRevenueByPlan);
router.get('/recent-admissions', getRecentAdmissions);

module.exports = router;
