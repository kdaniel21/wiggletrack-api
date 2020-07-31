const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const handleError = require('./controllers/error-controller');
const productRouter = require('./routes/product-routes');
const authRouter = require('./routes/auth-routes');
const userRouter = require('./routes/user-routes');
const reportErrorRouter = require('./routes/feedback-routes');

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
// CORS
app.use(cors({ origin: true, credentials: true }));
// Parse cookies
app.use(cookieParser());

// ROUTES
app.use('/api/v1/products', productRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/feedbacks', reportErrorRouter);

// Register error handling
app.use(handleError);
module.exports = app;
