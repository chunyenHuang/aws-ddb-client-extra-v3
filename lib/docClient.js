const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

const {
  groupArrayByCount,
  batchAction,
  wait,
} = require('./helpers');

module.exports = (awsConfig = {}, options = {}) => {
  const {
    maxItemsInBatch = 24,
    defaultBatchUpdateInterval = 500,
    continuousQueryInterval = 200,
  } = options;

  const client = new DynamoDBClient(awsConfig);
  const docClient = DynamoDBDocument.from(client);

  docClient.queryAll = async (inParams, inPreviousItems = []) => {
    const { Items, LastEvaluatedKey } = await docClient.query(inParams).promise();

    let items;
    if (LastEvaluatedKey) {
      await wait(continuousQueryInterval);

      inParams.ExclusiveStartKey = LastEvaluatedKey;
      items = await docClient.queryAll(inParams, Items);
    } else {
      items = Items;
    }
    return [...items, ...inPreviousItems];
  };

  docClient.scanAll = async (inParams, inPreviousItems = []) => {
    const { Items, LastEvaluatedKey } = await docClient.scan(inParams).promise();
    inParams.ExclusiveStartKey = LastEvaluatedKey;

    let items;
    if (LastEvaluatedKey) {
      await wait(continuousQueryInterval);

      inParams.ExclusiveStartKey = LastEvaluatedKey;
      items = await docClient.scanAll(inParams, Items);
    } else {
      items = Items;
    }
    return [...items, ...inPreviousItems];
  };

  docClient.batchUpdate = (inTableName, inData = [], inBatchUpdateInterval = defaultBatchUpdateInterval, inPrimaryKey = null, inSortKey = null) => {
    const groups = groupArrayByCount(inData, maxItemsInBatch * 3);

    return Promise.all(groups.map((groupData) => {
      return batchAction(inTableName, 'PutRequest', inPrimaryKey, inSortKey, groupData, inBatchUpdateInterval);
    }));
  };

  docClient.batchDelete = (inTableName, inPrimaryKey, inSortKey, inData = [], inBatchUpdateInterval = defaultBatchUpdateInterval) => {
    const groups = groupArrayByCount(inData, maxItemsInBatch * 3);

    return Promise.all(groups.map((groupData) => {
      return batchAction(inTableName, 'DeleteRequest', inPrimaryKey, inSortKey, groupData, inBatchUpdateInterval);
    }));
  };

  return docClient;
};
