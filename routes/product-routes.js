const express = require('express');
const productController = require('../controllers/product-controller');
const authController = require('../controllers/auth-controller');

const router = express.Router();

// NOT PROTECTED ROUTES
router.get('/', productController.getAllProducts);
router.post(
  '/check',
  authController.protect,
  productController.testCheckProduct
);
router.get('/:id/history', productController.getProductHistory);
router.get('/:id', productController.getProduct);

// USER ONLY ROUTES
router.use(authController.protect);

router.post('/', productController.registerProduct);
router
  .route('/:id')
  .post(productController.bookmarkProduct)
  .delete(productController.unbookmarkProduct);

router
  .route('/:id/notifications')
  .post(productController.enableNotifications)
  .delete(productController.disableNotifications);

module.exports = router;
