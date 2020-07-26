const AppError = require('../utils/app-error');

const handleError = (err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') return handleDevError(err, res);

  // Convert errors
  return handleProdError(err, res);
};

const handleDevError = (err, res) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    ...err,
    stack: err.stack,
  });
};

const handleProdError = (err, res) => {
  console.log(err);
  if (!err.isOperational)
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong! Please try again.',
    });

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

module.exports = handleError;
