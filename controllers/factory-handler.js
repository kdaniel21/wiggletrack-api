const APIFeatures = require('../utils/api-features');
const AppError = require('../utils/app-error');
const catchAsync = require('../utils/catch-async');

const noDocFound = (next) => {
  next(new AppError('No document was found with the provided id.', 404));
};

exports.getOne = (Model, options) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (options) {
      if (options.select) query = query.select(options.select);
    }

    const doc = await query;
    if (!doc) return noDocFound(next);

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

exports.getAll = (Model, options) =>
  catchAsync(async (req, res, next) => {
    let query = Model.find();
    if (options) {
      if (options.queryCondition) query = query.find(options.queryCondition);
      if (options.select) query = query.select(options.select);
    }

    // Get number of total results
    let countQuery = Model.find().merge(query).countDocuments();
    const count = await new APIFeatures(countQuery, req.query).search().query;

    const features = new APIFeatures(query, req.query)
      .search()
      .sort()
      .paginate();

    const docs = await features.query;

    res.status(200).json({
      status: 'success',
      length: count,
      data: docs,
    });
  });

exports.createOne = (Model, allowedFields) =>
  catchAsync(async (req, res, next) => {
    // Copy only allowed properties from body
    const newDocData = {};
    allowedFields.forEach((field) => {
      newDocData[field] = req.body[field];
    });

    if (options) {
      if (options.addUser) newDocData.user = req.user._id;
    }

    const newDoc = await Model.create(newDocData);

    res.status(201).json({
      status: 'success',
      data: newDoc,
    });
  });

exports.updateOne = (Model, allowedFields, options) =>
  catchAsync(async (req, res, next) => {
    // Copy only allowed properties from body
    const updatedDocData = {};
    allowedFields.forEach((field) => {
      if (req.body.hasOwnProperty(field))
        updatedDocData[field] = req.body[field];
    });

    const doc = await Model.findByIdAndUpdate(req.params.id, updatedDocData, {
      new: true,
    });

    res.status(201).json({
      status: 'success',
      data: doc,
    });
  });
