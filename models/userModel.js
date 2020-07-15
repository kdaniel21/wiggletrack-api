const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, validate: validator.isEmail },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    passwordConfirm: {
      type: String,
      minlength: 8,
    },
    items: Array,
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
