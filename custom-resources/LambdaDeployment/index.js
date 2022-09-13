var AWS = require('aws-sdk'),
  lambda = new AWS.Lambda(),
  apigateway = new AWS.APIGateway();
var response = require('cfn-response');
exports.handler = (event, context) => {
  if (event.RequestType == 'Delete') {
    return response.send(event, context, response.SUCCESS);
  }
  switch (event.ResourceType) {
    case 'Custom::LambdaVersion':
      var lambdaName = (event.ResourceProperties.FunctionName !== 'undefined' ? event.ResourceProperties.FunctionName : null);
      lambda.publishVersion({ FunctionName: lambdaName, Description: event.ResourceProperties.DeploymentTime }).promise().then((data) => {
        return response.send(event, context, response.SUCCESS, { 'Version': data.Version }, data.FunctionArn);
      }).catch((err) => {
        return response.send(event, context, response.FAILED, err);
      });
      break;
    case 'Custom::ApiDeployment':
      var restApiId = (event.ResourceProperties.RestApiId !== 'undefined' ? event.ResourceProperties.RestApiId : null);
      var stageName = (event.ResourceProperties.StageName !== 'undefined' ? event.ResourceProperties.StageName : null);
      var stageDescription = (event.ResourceProperties.stageDescription !== 'undefined' ? event.ResourceProperties.stageDescription : null);
      var description = (event.ResourceProperties.description !== 'undefined' ? event.ResourceProperties.description : null);
      var tracingEnabled = (event.ResourceProperties.tracingEnabled !== 'undefined' ? event.ResourceProperties.tracingEnabled : null);
      var variables = (event.ResourceProperties.variables !== 'undefined' ? event.ResourceProperties.variables : null);

      var params = {
        restApiId: restApiId,
        description: description,
        stageDescription: stageDescription,
        stageName: stageName,
        tracingEnabled: tracingEnabled,
        variables: variables
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