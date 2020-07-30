const factoryHandler = require('./factory-handler');
const Feedback = require('../models/feedback-model');

exports.reportErrorMiddleware = (req, res, next) => {
  req.body.type = 'bug-report';
  next();
};

exports.reportError = factoryHandler.createOne(Feedback, [
  'type',
  'user',
  'message',
  'media',
]);
