const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user-model');
const catchAsync = require('../utils/catch-async');
const AppError = require('../utils/app-error');
const Email = require('../utils/email');

const loginUser = async (user, statusCode, res) => {
  const accessToken = signToken(user._id);
  const refreshToken = await user.createRefreshToken();

  // Create refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    expires: new Date(
      Date.now() + process.env.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    // secure: process.env.NODE_ENV === 'production',
  });

  // Delete certain fields from the user
  const userCopy = { ...user.toObject() };
  delete userCopy.password;
  delete userCopy.refreshTokens;

  res.status(statusCode).json({
    status: 'success',
    user: userCopy,
    accessToken,
    refreshToken,
  });
};

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// ERROR MESSAGES
const invalidCredentials = (next) =>
  next(new AppError('Invalid credentials.', 401));

const sendUnauthorized = (next) => next(new AppError('Unauthorized.', 401));

// Expects name, email, password, passwordConfirm
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // Send register confirmation email
  new Email(newUser, process.env.SITE_URL)
    .sendRegistrationConfirmEmail()
    .then();

  await loginUser(newUser, 201, res);
});

// Expects email and password
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Try to find user
  const user = await User.findOne({ email }).select('+password');
  if (!user) return invalidCredentials(next);

  // Check password
  const isPasswordValid = await user.checkPassword(password, user.password);
  if (!isPasswordValid) return invalidCredentials(next);

  loginUser(user, 200, res);
});

exports.refreshToken = catchAsync(async (req, res, next) => {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

  if (!refreshToken)
    return next(new AppError('No refresh token was provided.', 400));

  // Get user based on refresh token
  const hashedToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex')
    .toString();
  const user = await User.findOne({
    refreshTokens: {
      $elemMatch: { token: hashedToken, expiresAt: { $gte: Date.now() } },
    },
  });
  if (!user) return next(new AppError('Invalid refresh token'));

  // Generate new tokens
  const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  const newRefreshToken = await user.replaceRefreshToken(refreshToken);

  res.cookie('refreshToken', newRefreshToken, {
    expires: new Date(
      Date.now() + process.env.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    // secure: process.env.NODE_ENV === 'production',
  });

  res.status(200).json({
    status: 'success',
    refreshToken: newRefreshToken,
    accessToken: newAccessToken,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith('Bearer')
  )
    return sendUnauthorized(next);

  // Check JWT token validity
  const jwtToken = req.headers.authorization.split(' ')[1];
  const decodedToken = jwt.verify(jwtToken, process.env.JWT_SECRET);
  if (!decodedToken) return sendUnauthorized(next);

  // Include user object to the request
  const user = await User.findById(decodedToken.id);
  if (!user) return sendUnauthorized(next);
  req.user = user;

  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return next(new AppError('This email address does not exist!', 400));

  // Generate and save token
  const token = await user.createPasswordResetToken();

  // Save email
  const url = `${process.env.SITE_URL}/reset-password/${token}`;
  await new Email(user, url).sendPasswordResetEmail();

  res.status(200).json({
    status: 'success',
    message: 'Password reset email successfully sent!',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const token = req.params.token;
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
    .toString();

  // Get user & validate token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiration: { $gte: Date.now() },
  });
  if (!user) return next(new AppError('Invalid token.', 401));

  // Update password
  const { password, passwordConfirm } = req.body;
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  loginUser(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

  if (!refreshToken)
    return next(new AppError('No refresh token was provided.'));

  // Destroy refresh token
  await req.user.destroyRefreshToken(refreshToken);

  // Send empty cookie
  res.cookie('refreshToken', 'null', {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out!',
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm, currentPassword } = req.body;
  if (!password || !passwordConfirm || !currentPassword)
    return next(
      new AppError(
        'Password, password confirm and current password must be provided!',
        400
      )
    );

  // Check current password
  const user = await User.findById(req.user._id).select(
    'password refreshTokens'
  );
  const isPasswordValid = await user.checkPassword(
    currentPassword,
    user.password
  );
  if (!isPasswordValid) return next(new AppError('Invalid password.', 403));

  await user.updatePassword(
    password,
    passwordConfirm,
    req.cookies.refreshToken
  );

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully!',
  });
});
