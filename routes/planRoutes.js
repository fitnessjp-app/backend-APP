const express = require('express');
const { body } = require('express-validator');
const { createPlan, getPlans, updatePlan, deletePlan } = require('../controllers/planController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

// Admin-only app: every plan route needs a login.
router.use(authMiddleware);

const planRules = [
  body('name').trim().notEmpty().withMessage('Plan name is required'),
  body('durationInMonths').isInt({ min: 1 }).withMessage('Duration in months must be a positive integer'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
];

router.get('/', getPlans);
router.post('/', planRules, validate, createPlan);
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Plan name cannot be empty'),
    body('durationInMonths').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  ],
  validate,
  updatePlan
);
router.delete('/:id', deletePlan);

module.exports = router;
