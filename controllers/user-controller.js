const Product = require('../models/product-model');
const User = require('../models/user-model');
const catchAsync = require('../utils/catch-async');
const factoryHandler = require('./factory-handler');

exports.getOwnProfile = (req, res, next) => {
  req.params.id = req.user._id;
  next();
};

exports.updateProfile = factoryHandler.updateOne(User, [
  'name',
  'email',
  'active',
]);

exports.getProfile = factoryHandler.getOne(User);

exports.getOwnProducts = catchAsync(async (req, res, next) => {
  // Page for pagination
  const page = +req.query.page;
  const limit = +req.query.limit || 3;
  const skip = (page - 1) * limit;

  console.log(limit, skip);

  // Query
  await req.user
    .populate({
      path: 'products',
      populate: {
        path: 'product',
        model: 'Product',
        select: 'name images ',
        perDocumentLimit: limit,
        options: {
          skip
        }
      },
    }).execPopulate();

  // Filter out invalid products if any
  req.user.products = req.user.products.filter(product => !!product.product);

  res.status(200).json({
    status: 'success',
    data: req.user.products,
  });
});

exports.disableAllNotifications = catchAsync(async (req, res, next) => {
  // Disable notification on products
  await Product.updateMany(
    {
      notifications: { $elemMatch: { userId: req.user._id } },
    },
    {
      $pull: { notifications: { userId: req.user._id } },
    }
  );

  // Disable notifications on user
  req.user.products.forEach((product) => (product.notifications = false));
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'All notifications disabled successfully!',
  });
});
