require('dotenv').config();

const { fromIni } = require('@aws-sdk/credential-providers');

const { docClient: docClientExtra } = require('../index');

const {
  AWS_PROFILE,
  AWS_REGION,
  TEST_TABLE_NAME,
  TEST_ITEM_ID,
} = process.env;

const config = {
  region: AWS_REGION,
  credentials: fromIni({
    profile: AWS_PROFILE,
  }),
};

describe('DynamoDB', () => {
  test('docClient', async () => {
    const docClient = docClientExtra(config);

    const res = await docClient.get({
      TableName: TEST_TABLE_NAME,
      Key: {
        id: TEST_ITEM_ID,
      },
    });

    expect(res['$metadata']).toBeDefined();
    expect(res.Item).toBeDefined();
  });
});
