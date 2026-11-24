require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const startCronJobs = require('./utils/cronJobs');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const planRoutes = require('./routes/planRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const receiptRoutes = require('./routes/receiptRoutes');

connectDB();

const app = express();

// Render / Railway / Heroku sit behind a proxy — needed for correct client IPs (rate limiting).
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CLIENT_URL can hold several origins, comma separated:
//   CLIENT_URL=https://admin.mygym.com,http://localhost:5173
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / health checks
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'FitZone API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/analytics', analyticsRoutes);
// Public: the receipt QR opens this (token protected, no login).
app.use('/api/receipts', receiptRoutes);

app.use(notFound);
app.use(errorHandler);

startCronJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`FitZone backend running on port ${PORT}`));
