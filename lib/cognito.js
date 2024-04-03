const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');


module.exports = (config) => {
  const cognito = new CognitoIdentityProvider(config);
  return cognito;
};
