module.exports = (text, options) => {
  const escapedText = text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

  // Add start and end only if necessary
  return new RegExp(
    `${options && options.start ? '^' : ''}${escapedText.toLowerCase()}${
      options && options.end ? '$' : ''
    }`,
    'i'
  );
};
