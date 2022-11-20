@echo off
set CUR_HH=%time:~0,2%
if %CUR_HH% lss 10 (set CUR_HH=0%time:~1,1%)
set version=%CUR_HH%%time:~3,2%%time:~6,2%
set bucket=ito-437950194672-lambda-deployments
set url_bucket=s3://%bucket%/

: Deploy Lambda Deployment
cd ./code-lambda
zip -g LambdaDeployment%version%.zip .\index.js
zip -g LambdaDeployment%version%.zip .\cfn-response.js
aws s3 cp LambdaDeployment%version%.zip %url_bucket%LambdaDeployment%version%.zip
del LambdaDeployment%version%.zip

: Deploy stack
@REM cd ../iac
@REM aws cloudformation deploy --template "lambda-deployment.json" --stack-name "deployment-custom-resources" --parameter-overrides KeyFileLambdaDeployment=LambdaDeployment%version%.zip Project=itorvo GeneracionLogs=false --capabilities CAPABILITY_NAMED_IAM

cd ..

@REM aws s3 rm %url_bucket%LambdaDeployment%version%.zip