const crypto = require('crypto');

module.exports = (charLength = 32) => {
  const token = crypto.randomBytes(charLength).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
    .toString();

  return { token, hashedToken };
};
