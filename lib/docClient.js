const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

const {
  groupArrayByCount,
  wait,
} = require('./helpers');

module.exports = (awsConfig = {}, translateConfig = {}, options = {}) => {
  const {
    maxItemsInBatch = 24,
    defaultBatchUpdateInterval = 500,
    continuousQueryInterval = 200,
  } = options;

  const client = new DynamoDBClient(awsConfig);
  const docClient = DynamoDBDocument.from(client, translateConfig);

  docClient.queryAll = async (inParams, inPreviousItems = []) => {
    const { Items, LastEvaluatedKey } = await docClient.query(inParams);

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
    const { Items, LastEvaluatedKey } = await docClient.scan(inParams);
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


  async function handleUnprocessedItems(inUnprocessed = [], inBatchUpdateInterval) {
    if (inUnprocessed.length === 0) return Promise.resolve();

    const nextUnprocssed = [];

    // try one more time for the unprocessed items
    await inUnprocessed.reduce(async (chain, requestParams, index) => {
      await chain;

      const interval = index === 0 ? 0 : inBatchUpdateInterval;
      await wait(interval);

      const params = {
        RequestItems: requestParams,
      };
      const { UnprocessedItems } = await docClient.batchWrite(params);
      if (Object.keys(UnprocessedItems).length > 0) {
        nextUnprocssed.push(UnprocessedItems);
      }
    }, Promise.resolve());

    return handleUnprocessedItems(nextUnprocssed, inBatchUpdateInterval);
  }

  /**
   * batchAction
   * @param {*} inTableName
   * @param {*} inRequestAction
   * @param {*} inPrimaryKey
   * @param {*} inSortKey
   * @param {*} inData
   * @param {*} inBatchUpdateInterval
   * @return {Promise}
   */
  async function batchAction(inTableName, inRequestAction, inPrimaryKey, inSortKey, inData, inBatchUpdateInterval = 2000) {
    let startIndex = 0;
    let endIndex = maxItemsInBatch;
    if (endIndex > inData.length) {
      endIndex = inData.length;
    }
    const tasks = [];
    while (endIndex <= inData.length && startIndex !== endIndex) {
      const toModifyData = [];
      for (let index = startIndex; index < endIndex; index++) {
        if (index >= inData.length) {
          break;
        }
        const item = inData[index];
        const modifyRequest = {
          [inRequestAction]: {},
        };
        switch (inRequestAction) {
        case 'PutRequest':
          modifyRequest[inRequestAction].Item = item;
          break;
        default:
          modifyRequest[inRequestAction].Key = {
            [inPrimaryKey]: item[inPrimaryKey],
          };
          break;
        }
        if (inSortKey) {
          modifyRequest[inRequestAction].Key[inSortKey] = item[inSortKey];
        }
        toModifyData.push(modifyRequest);
      }
      const params = {
        RequestItems: {
          [inTableName]: toModifyData,
        },
      };

      startIndex = endIndex;
      endIndex += maxItemsInBatch;
      if (endIndex > inData.length) {
        endIndex = inData.length;
      }
      tasks.push(params);
    }

    const unprocessedParams = [];
    await tasks.reduce(async (chain, taskParams, index) => {
      await chain;

      const interval = index === 0 ? 0 : inBatchUpdateInterval;
      await wait(interval);

      const { UnprocessedItems } = await docClient.batchWrite(taskParams);
      if (Object.keys(UnprocessedItems).length > 0) {
        unprocessedParams.push(UnprocessedItems);
      }
    }, Promise.resolve());

    return handleUnprocessedItems(unprocessedParams, inBatchUpdateInterval);
  }

  return docClient;
};
