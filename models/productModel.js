const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema({
  size: { type: String, required: true },
  price: { type: Number, required: true },
  color: { type: String, required: true },
  onStock: Boolean,
});

const productSchema = new mongoose.Schema(
  {
    name: String,
    colors: colorSchema,
    ratings: {
      average: Number,
      number: Number,
    },
    images: Array,
    history: colorSchema,
    url: { type: String, required: true },
    notifications: {
      email: String,
      name: String,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
