const express = require('express');
const userController = require('../controllers/user-controller');
const authController = require('../controllers/auth-controller');

const router = express.Router();

router.use(authController.protect);

router
  .route('/me')
  .get(userController.getOwnProfile, userController.getProfile)
  .patch(userController.getOwnProfile, userController.updateProfile);

router.get('/me/products', userController.getOwnProducts);
router.delete('/me/notifications', userController.disableAllNotifications);

module.exports = router;
