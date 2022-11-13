var AWS = require('aws-sdk');
var response = require('cfn-response');
exports.handler = (event, context) => {
  console.log(JSON.stringify(event));

  if (event.RequestType == 'Delete') {

    switch (event.ResourceType) {
      case 'Custom::ParameterSSM':
        let ssm = new AWS.SSM();
        var params = { Name: getValueParameter(event, 'Name') };

        ssm.deleteParameter(params).promise().then((data) => {
          return response.send(event, context, response.SUCCESS);
        }).catch((err) => {
          return response.send(event, context, response.FAILED, err);
        });

        break;
      case 'Custom::ApiDeployment':
      case 'Custom::LambdaVersion':
        return response.send(event, context, response.SUCCESS);
        break;

      default:
        return response.send(event, context, response.FAILED, 'This function only supports Custom::LambdaVersion and Custom::ApiDeployment resource types.');
    }

    return response.send(event, context, response.SUCCESS);

  }
  switch (event.ResourceType) {
    case 'Custom::LambdaVersion':
      let lambda = new AWS.Lambda();

      var lambdaName = getValueParameter(event, 'FunctionName');

      lambda.publishVersion({ FunctionName: lambdaName, Description: event.ResourceProperties.DeploymentTime }).promise().then((data) => {
        return response.send(event, context, response.SUCCESS, { 'Version': data.Version }, data.FunctionArn);
      }).catch((err) => {
        return response.send(event, context, response.FAILED, err);
      });
      break;

    case 'Custom::ParameterSSM':
      let ssm = new AWS.SSM();

      var name = getValueParameter(event, 'Name');
      var type = getValueParameter(event, 'Type');
      var description = getValueParameter(event, 'Description');
      var tier = getValueParameter(event, 'Tier');
      var dataType = getValueParameter(event, 'DataType');
      var value = getValueParameter(event, 'Value');
      var region = getValueParameter(event, 'Region');
      var accountId = getValueParameter(event, 'AccountId');
      var keyId = getValueParameter(event, 'KeyId');

      var params = {
        Name: name,
        Value: value,
        DataType: dataType,
        Description: description,
        KeyId: keyId,
        Overwrite: true,
        Tier: tier,
        Type: type
      };
      ssm.putParameter(params).promise().then((data) => {
        let arn = "arn:aws:ssm:" + region + ":" + accountId + ":parameter/" + name;
        return response.send(event, context, response.SUCCESS, { Version: data.Version, Arn: arn }, name);
      }).catch((err) => {
        return response.send(event, context, response.FAILED, err);
      });
      break;

    case 'Custom::ApiDeployment':
      let apigateway = new AWS.APIGateway();

      var restApiId = getValueParameter(event, 'restApiId');
      var stageName = getValueParameter(event, 'stageName');
      var stageDescription = getValueParameter(event, 'stageDescription');
      var description = getValueParameter(event, 'description');
      var tracingEnabled = getValueParameter(event, 'tracingEnabled');
      var variables = getValueParameter(event, 'variables');

      var params = {
        restApiId: restApiId,
        description: description,
        //stageDescription: stageDescription,
        //stageName: stageName,
        //tracingEnabled: false,
        //variables: variables
      };

      apigateway.createDeployment(params).promise().then((data) => {
        return response.send(event, context, response.SUCCESS, null, data.id);
      }).catch((err) => {
        return response.send(event, context, response.FAILED, err);
      });
      break;

    default:
      return response.send(event, context, response.FAILED, 'This function only supports Custom::LambdaVersion and Custom::ApiDeployment resource types.');
  }
};

function getValueParameter(event, property) {
  return (event.ResourceProperties[property] !== 'undefined' ? event.ResourceProperties[property] : null);
}