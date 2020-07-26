const scrapWiggle = require('./scraper');
const Product = require('../models/product-model');

const getAllData = async () => {
  const products = await Product.find({ active: true }).select('url');
  const res = [];

  for (const product of products) {
    // Get new data
    const newProduct = await scrapWiggle(product.url);

    // Refresh data on the model
    const r = await product.addDailyData(newProduct);
    res.push(r);

    // TODO: Send notification emails
  }

  return res;
};

module.exports = getAllData;
