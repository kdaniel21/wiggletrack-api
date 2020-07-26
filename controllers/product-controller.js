const Product = require('../models/product-model');
const User = require('../models/user-model');
const AppError = require('../utils/app-error');
const catchAsync = require('../utils/catch-async');
const scrapWiggle = require('../utils/scraper');
const factoryHandler = require('./factory-handler');

exports.registerProduct = catchAsync(async (req, res, next) => {
  // Create product
  const product = await Product.create({ url: req.body.url });

  // Add product to user's bookmarked products
  req.user.products.push({ product: product._id });
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: product,
  });
});

exports.getAllProducts = factoryHandler.getAll(Product, {
  select: '_id images name latestPriceRange',
});

exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('No product found!', 400));

  // Include latest price
  const latestPrice = await product.getLatestPrices();

  res.status(200).json({
    status: 'success',
    data: {
      ...product.toObject(),
      latestPrice,
    },
  });
});

// The query strings must use _ instead of spaces!
exports.getProductHistory = catchAsync(async (req, res, next) => {
  let { color, size } = req.query;
  const { id } = req.params;

  if (!color || !size || !id)
    return next(
      new AppError('Both color, size and product id must be provided!', 400)
    );

  // Replace _ with spaces
  color = color.replace(/_/g, ' ');
  size = size.replace(/_/g, ' ');

  const productHistory = await Product.getPriceHistory(id, color, size);
  res.status(200).json({
    status: 'success',
    data: productHistory,
  });
});

exports.bookmarkProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  // Check whether product exists and make it active
  const product = await Product.findByIdAndUpdate(
    id,
    { active: true },
    { new: true }
  );
  if (!product)
    return next(
      new AppError(
        'Product does not exist yet. You must register it before bookmarking.',
        404
      )
    );

  // Push to current user's products & save
  req.user.products.push({ product: id });
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Product bookmarked successfully!',
  });
});

exports.unbookmarkProduct = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Remove from user's products
  const i = req.user.products.findIndex((product) => product.product === id);
  req.user.products.splice(i, 1);
  await req.user.save({ validateBeforeSave: false });

  // NO PRODUCT DEACTIVATION
  // // Check whether product still needs to stay active
  // const isProductBookmarked = await User.findOne({
  //   'products.product': id,
  // });
  // // Deactive product if necessary
  // if (!isProductBookmarked)
  //   await Product.findByIdAndUpdate(id, { active: false });

  res.status(200).json({
    status: 'success',
    message: 'Product removed from bookmarks successfully!',
  });
});

// Expects id as parameter and priceBelow in the body (in EUR)
exports.enableNotifications = catchAsync(async (req, res, next) => {
  if (!req.body.priceBelow)
    return next(new AppError('A price threshold must be provided!'));

  const { id } = req.params;

  const index = req.user.products.findIndex(
    (prod) => prod.product.toString() === id
  );
  if (index === -1)
    return next(
      new AppError(
        'To enable notifications you must bookmark the product first.',
        400
      )
    );

  const notification = {
    userId: req.user._id,
    email: req.user.email,
    name: req.user.name,
    priceBelow: +req.body.priceBelow * 100,
  };
  const product = await Product.findByIdAndUpdate(
    id,
    {
      $push: { notifications: notification },
    },
    { new: true }
  );
  if (!product) return next(new AppError('Product does not exist.', 400));

  req.user.products[index].notifications = true;
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Notifications successfully enabled.',
  });
});

exports.disableNotifications = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Remove from product model
  const product = await Product.findByIdAndUpdate(
    id,
    {
      $pull: { notifications: { userId: req.user._id } },
    },
    { new: true }
  );
  if (!product)
    return next(
      new AppError(
        'Product does not exist or you are not subscribed to notifications.',
        400
      )
    );

  // Remove from user model
  const index = req.user.products.findIndex(
    (product) => product.product.toString() === id
  );
  req.user.products[index].notifications = false;
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Notifications successfully disabled.',
  });
});

exports.testCheckProduct = catchAsync(async (req, res, next) => {
  const productData = await scrapWiggle(req.body.url);

  if (!productData.name || !productData.summary || !productData.prices)
    return next(new AppError('Invalid product url.', 400));

  res.status(200).json({
    status: 'success',
    data: {
      name: productData.name,
      img: productData.img,
    },
  });
});
