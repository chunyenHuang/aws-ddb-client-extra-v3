const { S3 } = require('@aws-sdk/client-s3');

module.exports = (config) => {
  const s3 = new S3(config);
  return s3;
};
