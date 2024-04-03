module.exports = {
  groupArrayByCount,
  handleUnprocessedItems,
  batchAction,
  wait,
};

function groupArrayByCount(inArray = [], inCount) {
  if (inCount <= 0) {
    return inArray;
  }
  const result = [];
  let currentGroupIndex = -1;
  inArray.forEach((item, index) => {
    if (index % inCount === 0) {
      currentGroupIndex++;
      result.push([]);
    }

    result[currentGroupIndex].push(item);
  });

  return result;
}

async function wait(waitTimeInMilliseconds = 0) {
  return new Promise((resolve) => setTimeout(resolve, waitTimeInMilliseconds));
}

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
    const { UnprocessedItems } = await docClient.batchWrite(params).promise();
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

    const { UnprocessedItems } = await docClient.batchWrite(taskParams).promise()
      .then(() => {
        if (Object.keys(UnprocessedItems).length > 0) {
          unprocessedParams.push(UnprocessedItems);
        }
      })
      .catch(reject);
  }, Promise.resolve());

  return handleUnprocessedItems(unprocessedParams, inBatchUpdateInterval);
}
