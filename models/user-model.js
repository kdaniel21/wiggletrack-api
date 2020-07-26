const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');

const generateToken = require('../utils/generate-token');

const productSchema = new mongoose.Schema({
  product: { type: mongoose.Types.ObjectId, ref: 'Product' },
  notifications: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: validator.isEmail,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      minlength: 8,
      required: true,
      validate: {
        validator(val) {
          return val === this.password;
        },
        message: 'The passwords must match!',
      },
    },
    products: [productSchema],
    refreshTokens: {
      type: [{ token: String, expiresAt: Date }],
      select: false,
    },
    lastActiveAt: Date,
    passwordResetToken: { type: String, select: false },
    passwordResetExpiration: { type: String, select: false },
    active: { type: Boolean, default: true, select: false },
  },
  { timestamps: true }
);

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex').toString();
};

userSchema.methods.createRefreshToken = async function () {
  // Generate random token
  const { token, hashedToken } = generateToken();

  // Save hashed token
  const newRefToken = {
    token: hashedToken,
    expiresAt: new Date(
      Date.now() + process.env.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
  };
  await this.constructor.findByIdAndUpdate(this._id, {
    $push: {
      refreshTokens: newRefToken,
    },
  });

  return token;
};

userSchema.methods.replaceRefreshToken = async function (oldRefreshToken) {
  const { token, hashedToken } = generateToken();

  // Hash old token to be able to compare it with the DB stored ones
  const oldHashedRefToken = hashToken(oldRefreshToken);
  // Get user with refreshTokens
  const user = await this.constructor
    .findById(this._id)
    .select('refreshTokens');
  // Find and replace old
  const oldIndex = user.refreshTokens.findIndex(
    (el) => el.token === oldHashedRefToken
  );
  user.refreshTokens[oldIndex].token = hashedToken;

  // Mark user as active
  user.lastActiveAt = Date.now();

  await user.save();

  return token;
};

// Check password
userSchema.methods.checkPassword = async function (
  inputPassword,
  encryptedPassword
) {
  const isPasswordValid = await bcrypt.compare(
    inputPassword,
    encryptedPassword
  );

  return isPasswordValid;
};

// Create password reset token
userSchema.methods.createPasswordResetToken = async function () {
  const { token, hashedToken } = generateToken(20);

  // Save tokens
  this.passwordResetToken = hashedToken;
  this.passwordResetExpiration = new Date(Date.now() + 30 * 60 * 1000);

  await this.save({ validateBeforeSave: false });

  return token;
};

// Destroy refresh token
userSchema.methods.destroyRefreshToken = function (refreshToken) {
  const hashedRefreshToken = hashToken(refreshToken);

  return this.constructor.findByIdAndUpdate(this._id, {
    $pull: { refreshTokens: { token: hashedRefreshToken } },
  });
};

// Update password
userSchema.methods.updatePassword = async function (
  newPassword,
  newPasswordConfirm,
  refreshToken
) {
  // Update password
  this.password = newPassword;
  this.passwordConfirm = newPasswordConfirm;

  // Delete all refresh tokens except the one that was used
  // -> other devices will be logged out
  let validTokenObjIndex;
  let refreshTokens;

  // If refresh token was keep that
  if (refreshToken) {
    const hashedRefreshToken = hashToken(refreshToken);
    refreshTokens = this.refreshTokens;
    // Query refresh tokens array if necessary
    if (refreshTokens <= 0) {
      const userObj = await his.constructor
        .findById(this._id)
        .select('refreshTokens');
      refreshTokens = userObj.refreshTokens;
    }

    // Find index of used refresh token object
    validTokenObjIndex = refreshTokens.findIndex(
      (ref) => ref.token === hashedRefreshToken
    );
  }

  // Refresh token object to keep (if any)
  const validTokenObj = validTokenObjIndex
    ? refreshTokens[validTokenObjIndex]
    : null;
  this.refreshTokens = [validTokenObj];

  return this.save();
};

// Encrypt password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) next();

  this.password = await bcrypt.hash(this.password, +process.env.SALT_ROUNDS);
  this.passwordConfirm = undefined;

  next();
});

// Hide not active users
userSchema.pre(/^find/, function (next) {
  this.where({ active: true });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
