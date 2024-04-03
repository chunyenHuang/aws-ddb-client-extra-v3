module.exports = {
  groupArrayByCount,
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
