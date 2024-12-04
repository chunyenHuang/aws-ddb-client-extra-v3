const validateFunc = require('jsonschema').validate;

const sanitize = (data = {}) => {
  delete data.__typename;

  Object.keys(data).forEach((key) => {
    if (data[key] === null) {
      delete data[key];
    } else if (Array.isArray(data[key])) {
      data[key].forEach((item) => sanitize(item));
    } else if (typeof (data[key]) === 'object') {
      sanitize(data[key]);
    }
  });

  return data;
};

const validate = (jsonSchema, typeName, action = 'udpate', item) => {
  if (!jsonSchema) return item;

  const copiedItem = sanitize(JSON.parse(JSON.stringify(item)));

  const input = {
    Mutation: {
      [`${action.toLowerCase()}${typeName}`]: {
        arguments: {
          input: copiedItem,
        },
      },
    },
  };

  const {
    instance,
    // schema,
    errors,
    valid,
  } = validateFunc(input, jsonSchema);

  if (!valid) {
    const errorMessages = errors.map(({ property, message }) => {
      const key = property.split('.').pop();
      return `${key} ${message}`;
    });

    console.error({
      instance,
      // errors,
      errorMessages,
    });

    throw new Error(errorMessages.join(','));
  }

  return item;
};

module.exports = {
  sanitize,
  validate,
};
