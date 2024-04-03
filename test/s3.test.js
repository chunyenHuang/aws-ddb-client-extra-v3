require('dotenv').config();

const { fromIni } = require('@aws-sdk/credential-providers');

const { s3: s3Extra } = require('../index');

const {
  AWS_PROFILE,
  AWS_REGION,
  TEST_S3_BUCKET_NAME,
} = process.env;

const config = {
  region: AWS_REGION,
  credentials: fromIni({
    profile: AWS_PROFILE,
  }),
};

describe('S3', () => {
  const s3 = s3Extra(config);

  test('putObject', async () => {
    const params = {
      Bucket: TEST_S3_BUCKET_NAME,
      Key: `${Date.now()}`,
      Body: '123',
    };

    const res = await s3.putObject(params);
    expect(res.ETag).toBeDefined();
  });


  test('listObjectsV2', async () => {
    const res = await s3.listObjectsV2({
      Bucket: TEST_S3_BUCKET_NAME,
    });
    expect(res.Contents.length).toBeGreaterThan(0);
  });
});
