require('dotenv').config();

const { fromIni } = require('@aws-sdk/credential-providers');

const { docClient: docClientExtra } = require('../index');

const {
  AWS_PROFILE,
  AWS_REGION,
  TEST_TABLE_NAME,
} = process.env;

const config = {
  region: AWS_REGION,
  credentials: fromIni({
    profile: AWS_PROFILE,
  }),
};

describe('DynamoDB', () => {
  const docClient = docClientExtra(config);
  const testId = `${Date.now()}`;

  test('Create Item', async () => {
    const res = await docClient.put({
      TableName: TEST_TABLE_NAME,
      Item: {
        id: testId,
      },
    });
    expect(res['$metadata']).toBeDefined();
  });

  test('Get Item', async () => {
    const res = await docClient.get({
      TableName: TEST_TABLE_NAME,
      Key: {
        id: testId,
      },
    });

    expect(res['$metadata']).toBeDefined();
    expect(res.Item.id).toEqual(testId);
  });
});
