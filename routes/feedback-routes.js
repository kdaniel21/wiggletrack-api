const express = require('express');
const reportErrorController = require('../controllers/feedback-controller');
const authController = require('../controllers/auth-controller');

const router = express.Router();

router.post(
  '/',
  authController.protect,
  reportErrorController.reportErrorMiddleware,
  reportErrorController.reportError
);

module.exports = router;
