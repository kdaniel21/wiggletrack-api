const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// MIDDLEWARES
// Secure HTTP Headers
app.use(helmet());
// Logging incoming requests
app.use(morgan('dev'));
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});
app.use(limiter);
// Body parsing
app.use(express.json({ limit: '10kb' }));
// Data sanitization (NoSQL Queries)
app.use(mongoSanitize());
// Data sanitization (XSS)
app.use(xss());
// Parameter pollution
app.use(cors({ origin: true, credentials: true }));
// Parse cookies
app.use(cookieParser());

module.exports = app;
