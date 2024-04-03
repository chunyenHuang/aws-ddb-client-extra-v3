require('dotenv').config();

const { fromIni } = require('@aws-sdk/credential-providers');

const { cognito: cognitoExtra } = require('../index');

const {
  AWS_PROFILE,
  AWS_REGION,
  TEST_USERPOOL_ID,
} = process.env;

const config = {
  region: AWS_REGION,
  credentials: fromIni({
    profile: AWS_PROFILE,
  }),
};

describe('Cognito', () => {
  const cognito = cognitoExtra(config);

  test('listGroups', async () => {
    const res = await cognito.listGroups({
      UserPoolId: TEST_USERPOOL_ID,
    });
    expect(res.Groups.length).toBeGreaterThan(0);
  });

  test('adminListGroupsForUser', async () => {
    const res = await cognito.adminListGroupsForUser({
      UserPoolId: TEST_USERPOOL_ID,
      Username: 'test1',
    });
    expect(res.Groups.length).toBeGreaterThan(0);
  });

});
