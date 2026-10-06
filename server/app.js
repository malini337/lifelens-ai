// Builds the Express app (middleware + routes). server.js starts it.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');
const documentRoutes = require('./routes/documentRoutes');
const actionRoutes = require('./routes/actionRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Needed when deployed behind a proxy (Render) so rate limiting sees real client IPs.
app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow tools like curl/Postman (no origin) and the configured client(s).
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a few minutes and try again.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
});
const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Analysis limit reached for now. Please try again in a while.' },
});

app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/analyze', analyzeLimiter, analyzeRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/reminders', reminderRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
