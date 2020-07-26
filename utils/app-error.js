module.exports = class AppError extends Error {
  constructor(errorMsg, statusCode) {
    super(errorMsg);

    this.statusCode = statusCode || 500;
    this.status = this.status < 500 ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this.constructor);
  }
};
