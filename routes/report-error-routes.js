const express = require('express');
const reportErrorController = require('../controllers/report-error-controller');

const router = express.Router();

router.post(
  '/',
  reportErrorController.reportErrorMiddleware,
  reportErrorController.reportError
);

module.exports = router;
