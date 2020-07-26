const express = require('express');
const authController = require('../controllers/auth-controller');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.protect, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/refresh', authController.refreshToken);
router.patch(
  '/update-password',
  authController.protect,
  authController.updatePassword
);

module.exports = router;
