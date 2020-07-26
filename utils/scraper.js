const cheerio = require('cheerio');
const axios = require('axios');

const fetchHtml = async (url) => {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch {
    console.error(
      `ERROR: An error occurred while trying to fetch the URL: ${url}`
    );
  }
};

const scrapWiggle = async (url) => {
  const html = await fetchHtml(url);
  const selector = cheerio.load(html);

  const productPage = selector('body')
    .find('#wiggle')
    // .find('.container')
    // .find('.browse-menu.menu-box.ProductLandingPage.allow-comparison')
    .find('.MainColumn');

  const product = extractProduct(productPage);
  return product;
};

const extractProduct = (selector) => {
  // BASIC INFORMATION ABOUT THE PRODUCT
  const name = selector.find('.row').find('.col-xs-12').eq(0).text().trim();

  const ratingsInfo = selector
    .find('#itemtop')
    // .find('.col-xs-12')
    // .find('div')
    .find('.bem-pdp__review-stars.js-anchor');
  const ratingAvg = ratingsInfo
    .find('span.bem-pdp__review-stars-container--top')
    .text()
    .trim();
  let numOfRatings = ratingsInfo.find('span#qa-numberOfReviews').text().trim();
  numOfRatings = numOfRatings.replace(/\(|\)/g, '');

  const summary = selector.find('[itemprop="description"]').text().trim();

  let img = selector
    .find('.bem-pdp__gallery-container')
    .children('img')
    .attr('src');
  // If url starts with '//' trim it
  if (img.startsWith('//')) img = img.replace('//', '');
  // Add https.//
  if (!img.startsWith('http')) img = `https://${img}`;
  // Remove query params
  img = img.split('?')[0];

  // PRICE & SIZE & COLOR
  const prices = [];

  selector
    .find('.bem-sku-selector__option.sku-items-children')
    .find('.bem-sku-selector__option-wrapper li')
    .each(function (i, el) {
      const productDetails = selector.find(el).children('input');

      const color = productDetails.attr('data-colour');
      const size = productDetails.attr('data-size');
      const price = productDetails.attr('data-unit-price');

      prices.push({ color, size, price });
    });

  return {
    name,
    summary,
    rating: { average: ratingAvg, quantity: numOfRatings },
    prices,
    img,
  };
};

module.exports = scrapWiggle;
