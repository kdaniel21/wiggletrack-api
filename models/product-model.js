const mongoose = require('mongoose');
const currencyConvert = require('../utils/currency-convert');
const scrapWiggle = require('../utils/scraper');
const parseRegex = require('../utils/parse-regex');
const Email = require('../utils/email');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: 'User' },
  email: String,
  name: String,
  priceBelow: Number,
});

const historySchema = new mongoose.Schema({
  price: Number,
  currency: String,
  timeAt: { type: Date, default: Date.now() },
});

const sizeSchema = new mongoose.Schema({
  size: String,
  history: { type: [historySchema], select: false },
});

const variantSchema = new mongoose.Schema({
  color: String,
  sizes: [sizeSchema],
});

const latestPriceRangeSchema = new mongoose.Schema({
  min: Number,
  max: Number,
});

const productSchema = new mongoose.Schema(
  {
    name: String,
    summary: String,
    url: { type: String, required: true, unique: true },
    rating: {
      average: Number,
      quantity: Number,
    },
    images: [String],
    variants: { type: [variantSchema] },
    // used to store the latest price range for faster search result queries
    latestPriceRange: latestPriceRangeSchema,
    notifications: { type: [notificationSchema], select: false },
    active: { type: Boolean, default: true, select: false },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Text index to search
productSchema.index(
  { name: 'text', 'variants.color': 'text', url: 'text' },
  { weights: { name: 10, 'variants.color': 4, url: 8 } }
);

productSchema.methods.addDailyData = async function (newData) {
  product = await this.constructor
    .findById(this._id)
    .select('+variants')
    .select('+variants.sizes.history');

  // Update product data
  product.name = newData.name;
  product.summary = newData.summary;
  product.rating = { ...newData.rating };
  if (!product.images.includes(newData.img)) product.images.push(newData.img);

  let minPrice;
  let maxPrice;
  newData.prices.forEach((newVariant) => {
    // Parse price and currency
    // Remove irrelevant , from price
    newVariant.price = newVariant.price.replace(',', '');
    const priceNum = +newVariant.price.match(/()[0-9]+(\.?)[0-9]+/g)[0];
    const currency = newVariant.price.match(/(€|$|CA$|AU$|£|NZ$){1}/g)[0];
    const currencyString = currencyConvert.currencyToString(currency);
    newVariant.price = priceNum * 100;
    newVariant.currency = currencyString;

    // Check for min and max price
    if (newVariant.price < minPrice || !minPrice) minPrice = newVariant.price;
    if (newVariant.price > maxPrice || !maxPrice) maxPrice = newVariant.price;

    // Get index of color
    let colorIndex = product.variants.findIndex(
      (variant) => variant.color === newVariant.color
    );
    // add color if necessary
    if (colorIndex === -1) {
      product.variants.push({ color: newVariant.color, sizes: [] });
      colorIndex = product.variants.length - 1;
    }

    // get index of size
    let sizeIndex = product.variants[colorIndex].sizes.findIndex(
      (colorVariant) => colorVariant.size === newVariant.size
    );
    // add size if necessary
    if (sizeIndex === -1) {
      product.variants[colorIndex].sizes.push({
        size: newVariant.size,
        history: [],
      });
      sizeIndex = product.variants[colorIndex].sizes.length - 1;
    }

    // add price but only if changed
    const history = product.variants[colorIndex].sizes[sizeIndex].history;
    if (
      history.length === 0 ||
      history[history.length - 1].price !== newVariant.price
    )
      history.push({
        price: newVariant.price,
        currency: newVariant.currency,
        timeAt: Date.now(),
      });
  });

  // Add min and max price
  product.latestPriceRange = { min: minPrice, max: maxPrice };

  await product.save();
};

productSchema.methods.getLatestPrices = async function () {
  const latestPrices = await this.constructor
    .aggregate()
    .match({ _id: this._id })
    .unwind('$variants')
    .unwind('$variants.sizes')
    .project({
      color: '$variants.color',
      size: '$variants.sizes.size',
      history: { $slice: ['$variants.sizes.history', -1] },
    })
    .unwind('$history')
    .group({
      _id: '$color',
      sizes: {
        $push: {
          size: '$size',
          price: '$history.price',
          currency: '$history.currency',
        },
      },
    })
    .project({
      _id: 0,
      color: '$_id',
      sizes: '$sizes',
    });

  return latestPrices;
};

// Get all variant types
// Used by clients
productSchema.methods.getAllVariants = function () {
  return this.constructor
    .aggregate()
    .match({ _id: this._id })
    .unwind('$variants')
    .unwind('$variants.color')
    .project({
      _id: 0,
      color: '$variants.color',
      sizes: '$variants.sizes.size',
    });
};

// Get price history for specific size and color
// Used by clients to get data
productSchema.statics.getPriceHistory = async function (id, color, size) {
  const colorRegex = parseRegex(color, { start: true, end: true });
  const sizeRegex = parseRegex(size, { start: true, end: true });

  const priceHistory = await this.aggregate()
    // Getting only objects with the specific ID
    .match({
      _id: mongoose.Types.ObjectId(id),
    })
    .limit(1)
    .unwind('$variants')
    // Filtering out other colors (+case insensitive!)
    .match({ 'variants.color': colorRegex })
    .unwind('$variants.sizes')
    // Filtering out other sizes (+case insensitive!)
    .match({
      'variants.sizes.size': sizeRegex,
    })
    .unwind('$variants.sizes.history')
    // Ordering and transforming the data
    .group({
      _id: null,
      size: { $first: '$variants.sizes.size' },
      color: { $first: '$variants.color' },
      prices: { $push: '$variants.sizes.history' },
    })
    .project({ _id: 0, size: '$size', color: '$color', prices: '$prices' });

  return priceHistory[0];
};

// FETCH FIRST DATA WHEN REGISTERING PRODUCT
// Transfer .isNew or .isModified(') property to the post middleware
productSchema.pre('save', function (next) {
  if (this.isNew) this.wasNew = true;
  else if (this.isModified('latestPriceRange')) this.priceRangeModified = true;
  next();
});
// Fetch first data
productSchema.post('save', function () {
  if (!this.wasNew) return;
  // No async/await so that the response does not need to wait for this to finish
  scrapWiggle(this.url).then((data) => this.addDailyData(data));
});

// Send notification emails whom necessary
productSchema.post('save', async function (doc) {
  if (!this.priceRangeModified) return;

  // Get users who needs to receive email
  const docWithNotifications = await this.constructor
    .findById(doc._id)
    .select('notifications');
  const sendEmailTo = [];
  docWithNotifications.notifications.forEach((el, index) => {
    // Collect only notification objects where the price is has dropped below the wanted amount
    if (!el.priceBelow >= doc.latestPriceRange.min) return;

    // Move to sendEmailTo
    sendEmailTo.push(el);
    // Remove from this array
    docWithNotifications.notifications.splice(index, 1);
  });

  // Send emails
  for (notification of sendEmailTo) {
    await new Email(
      { name: notification.name, email: notification.email },
      doc.url,
      {
        product: {
          name: doc.name,
          price: doc.latestPriceRange.min / 100,
          trackerUrl: `${process.env.SITE_URL}/products/${doc._id}`,
        },
      }
    ).sendPriceNotificationEmail();
  }

  // Delete notifications from the products
  await docWithNotifications.save();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
