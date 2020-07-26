const parseRegex = require('./parse-regex');

module.exports = class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  search() {
    const searchValue = this.queryString.search;
    if (searchValue) this.query.find({ $text: { $search: searchValue } });

    return this;
  }

  // filter() {
  //   // Query params from request
  //   let filters = { ...this.queryString };
  //   const excludedFields = ['page', 'sort', 'limit', 'fields'];
  //   // Removing fields that are not filters
  //   excludedFields.forEach((el) => delete filters[el]);

  //   // Parse values to regex
  //   // Object.keys(filters).forEach((key) => {
  //   //   const newVal = { $regex: parseRegex(filters[key]) };
  //   //   filters[key] = newVal;
  //   // });

  //   // Adding filter to the query
  //   this.query.find({ $text: { $search: filters['name'] } });

  //   return this;
  // }

  sort() {
    let sortBy = 'updatedAt';
    if (this.queryString.sort)
      sortBy = this.queryString.sort.replace(/,/g, ' ');

    this.query.sort(sortBy);

    return this;
  }

  limit() {
    if (this.queryString.fields) {
      const fields = this.queryString.replace(/,/g, ' ');
      this.query = this.query.select(fields);
    } else {
      this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = +this.queryString.page || 1;
    const limit = +this.queryString.limit || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.limit(limit).skip(skip);

    return this;
  }
};
