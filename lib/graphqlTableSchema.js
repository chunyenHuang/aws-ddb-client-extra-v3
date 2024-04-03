const validateFunc = require('jsonschema').validate;

const validate = (jsonSchema, typeName, action = 'udpate', item) => {
  if (!jsonSchema) return item;

  const copiedItem = JSON.parse(JSON.stringify(item));

  delete copiedItem.__typename;

  // TODO: Handle null value in json schema
  Object.keys(copiedItem).forEach((key) => {
    if (copiedItem[key] === null) {
      delete copiedItem[key];
    }
  });

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
  validate,
};
