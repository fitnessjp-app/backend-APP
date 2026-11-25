const express = require('express');
const { body } = require('express-validator');
const {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  renewMember,
  deleteMember,
} = require('../controllers/memberController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authMiddleware);

const admissionValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid email or leave it empty'),
  body('phone').matches(/^\d{10}$/).withMessage('Phone must be a 10-digit number'),
  body('batch').optional({ values: 'falsy' }).isIn(['morning', 'evening']).withMessage('Batch must be morning or evening'),
  body('plan').notEmpty().withMessage('Plan is required'),
  // Old members are entered without a payment, so amount is checked in the controller.
  body('amountPaid').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Amount paid must be a non-negative number'),
];

router.post('/', upload.single('photo'), admissionValidation, validate, createMember);
router.get('/', getMembers);
router.get('/:id', getMemberById);
router.put('/:id', upload.single('photo'), updateMember);
router.put(
  '/:id/renew',
  [
    body('plan').notEmpty().withMessage('Plan is required'),
    body('amountPaid').isFloat({ min: 0 }).withMessage('Amount paid must be a non-negative number'),
  ],
  validate,
  renewMember
);
router.delete('/:id', deleteMember);

module.exports = router;
