const { v1: uuidv1 } = require('uuid');

const docClientExtra = require('./docClient');
const { validate } = require('./graphqlTableSchema');

module.exports = ({
  // Instance
  docClient: inDocClient,
  awsConfig = {},
  jsonSchema,
  // Table details
  tableName = '',
  partitionKey = 'id',
  sortKey,
  methods = {},
  // TODO: ttl expirationUnixTime
  // TODO: add timestamp programmatically
}) => {
  const docClient = inDocClient || docClientExtra(awsConfig);

  const [typeName] = tableName.split('-');

  const table = {
    tableName,
    typeName,
    partitionKeyName: partitionKey,
    sortKeyName: sortKey,
    docClient,
    queryAll: docClient.queryAll,
    scanAll: docClient.scanAll,
    jsonSchema,
    validate,
  };

  const format = (item) => {
    const updatedItem = {
      ...item,
      __typename: typeName,
    };

    return updatedItem;
  };

  Object.assign(table, {
    generateUUID() {
      return uuidv1();
    },

    async listAll() {
      const params = {
        TableName: table.tableName,
      };

      return docClient.scanAll(params);
    },

    async get(partitionKey, sortKey) {
      const params = {
        TableName: table.tableName,
        Key: {
          [table.partitionKeyName]: partitionKey,
        },
      };

      if (table.sortKeyName && sortKey) {
        params.Key[table.sortKeyName] = sortKey;
      }

      const { Item } = await docClient.get(params);
      return Item;
    },

    async patch(partitionKey, sortKey, toUpdateProps = {}) {
      let item = {
        [table.partitionKeyName]: partitionKey,
        ...(table.sortKeyName && {
          [table.sortKeyName]: sortKey,
        }),
        ...toUpdateProps,
      };

      item = validate(jsonSchema, typeName, 'update', item);

      const updateExpression = getUpdateExpression(toUpdateProps);

      const params = Object.assign(updateExpression, {
        TableName: table.tableName,
        Key: {
          [table.partitionKeyName]: partitionKey,
        },
      });

      if (table.sortKeyName && sortKey) {
        params.Key[table.sortKeyName] = sortKey;
      }

      await docClient.update(params);

      return item;
    },

    async create(item) {
      item = format(validate(jsonSchema, typeName, 'create', item));

      const updateParams = {
        TableName: table.tableName,
        Item: item,
      };
      await docClient.put(updateParams);

      return item;
    },

    async update(item) {
      item = format(validate(jsonSchema, typeName, 'update', item));

      const updateParams = {
        TableName: table.tableName,
        Item: item,
      };
      await docClient.put(updateParams);

      return item;
    },

    async delete(partitionKey, sortKey) {
      const params = {
        TableName: table.tableName,
        Key: {
          [table.partitionKeyName]: partitionKey,
        },
      };

      if (table.sortKeyName && sortKey) {
        params.Key[table.sortKeyName] = sortKey;
      }

      return docClient.delete(params);
    },

    async batchCreate(items) {
      if (items.length === 0) return [];

      items = items.map((item) => {
        return format(validate(jsonSchema, typeName, 'create', item));
      });

      await docClient.batchUpdate(table.tableName, items);

      return items;
    },

    async batchUpdate(items) {
      if (items.length === 0) return [];

      items = items.map((item) => {
        return format(validate(jsonSchema, typeName, 'update', item));
      });

      await docClient.batchUpdate(table.tableName, items);

      return items;
    },

    async batchDelete(items) {
      if (items.length === 0) return [];

      return docClient.batchDelete(table.tableName, table.partitionKeyName, table.sortKeyName, items, 300);
    },

  });

  Object.keys(methods).map((key) => {
    table[key] = methods[key];
  });

  return table;
};

function getUpdateExpression(inUpdateProps = {}) {
  const expressions = [
    // #lastName = :lastName
  ];
  const names = {
    // "#lastName": "lastName",
  };
  const values = {
    // ":lastName": "L. Doe",
  };

  const sanitize = (inObject) => {
    if (!!inObject && inObject.constructor === Object) {
      Object.keys(inObject).forEach((key) => {
        const item = inObject[key];
        if (!!item && item.constructor === Object) {
          return sanitize(item);
        }
        if (item === '' || item === undefined) {
          delete inObject[key];
          return;
        }
      });
    }

    return inObject;
  };

  Object.keys(inUpdateProps).forEach((key) => {
    const item = sanitize(inUpdateProps[key]);
    if (item === '' || item === undefined) {
      return;
    }
    expressions.push(`#${key} = :${key}`);
    names[`#${key}`] = key;
    values[`:${key}`] = item;
  });

  return {
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}
