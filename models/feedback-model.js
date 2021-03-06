const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['general', 'bug-report'],
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    media: [String],
    os: String,
    browser: String,
    page: String,
  },
  { timestamps: true }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
