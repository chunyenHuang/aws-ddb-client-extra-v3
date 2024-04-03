# aws-ddb-client-extra-v3


## GetStarted

```bash
npm i --save \
  @aws-sdk/credential-providers \
  @aws-sdk/client-cognito-identity-provider \
  @aws-sdk/lib-dynamodb \
  @aws-sdk/client-dynamodb \
  aws-sdk-extra-v3
```

## DynamoDB DocumentClient Extra

```javascript
const { fromIni } = require('@aws-sdk/credential-providers');
const { docClient: docClientExtra } = require('aws-sdk-extra-v3');

const { AWS_PROFILE, AWS_REGION } = process.env;

const config = {
  region: AWS_REGION,
  credentials: fromIni({
    profile: AWS_PROFILE,
  }),
};

const docClient = docClientExtra(config);

const res = await docClient.get({
  TableName: '',
  Key: {
    id: '',
  },
});
```