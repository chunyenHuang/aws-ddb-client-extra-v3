require('dotenv').config();

const { fromIni } = require('@aws-sdk/credential-providers');
const { graphqlTableInstance } = require('../index');

const {
  AWS_PROFILE,
  AWS_REGION,
  TEST_TABLE_NAME,
} = process.env;

const tableInstance = (config = {}) => {
  return graphqlTableInstance({
    awsConfig: {
      region: AWS_REGION,
      credentials: fromIni({
        profile: AWS_PROFILE,
      }),
    },
    jsonSchema: undefined,
    ...config,
  })
};

describe('graphqlTableInstance', () => {
  const config = {
    tableName: TEST_TABLE_NAME,
    partitionKey: 'id',
  };

  const table = tableInstance(config);

  const testId = `${Date.now()}`;

  test('Create', async () => {
    const res = await table.create({
      id: testId,
    });
    expect(res).toEqual({
      id: testId,
      __typename: TEST_TABLE_NAME,
    })
  });

  test('Get', async () => {
    const res = await table.get(testId);
    expect(res).toEqual({
      id: testId,
      __typename: TEST_TABLE_NAME,
    })
  });

  test('Patch', async () => {
    const res = await table.patch(testId, null, { value: 1 });
    expect(res).toEqual({
      id: testId,
      value: 1,
    })

    const updatedItem = await table.get(testId);
    expect(updatedItem.value).toEqual(1);
  });

  test('Update', async () => {
    const item = await table.get(testId);

    item.value = 2;

    await table.update(item);

    const updatedItem = await table.get(testId);

    expect(updatedItem.value).toEqual(2);
  });

  test('ListAll', async () => {
    const res = await table.listAll();
    expect(res.length).toBeGreaterThan(0);
  });

  test('Delete', async () => {
    await table.delete(testId);

    const deletedItem = await table.get(testId);
    expect(deletedItem).toBeUndefined();
  });


  test('batchCreate', async () => {
    const res = await table.batchCreate([{
      id: `${Date.now()}`,
    }]);
    expect(res.length).toEqual(1);
  });

  test('batchUpdate', async () => {
    const res = await table.batchUpdate([{
      id: `${Date.now()}`,
    }]);
    expect(res.length).toEqual(1);
  });

  test('batchDelete', async () => {
    const res = await table.batchUpdate([{
      id: `${Date.now()}`,
    }]);
    await table.batchDelete(res);

    const deletedItem = await table.get(res[0].id);
    expect(deletedItem).toBeUndefined();
  });
});
