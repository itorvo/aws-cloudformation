@echo off
set CUR_HH=%time:~0,2%
if %CUR_HH% lss 10 (set CUR_HH=0%time:~1,1%)
set version=%CUR_HH%%time:~3,2%%time:~6,2%
set bucket=test-my-bucket-aws
set url_bucket=s3://%bucket%/

: Deploy Lambda Deployment
cd ./LambdaDeployment
zip -g LambdaDeployment%version%.zip .\index.js
zip -g LambdaDeployment%version%.zip .\cfn-response.js
aws s3 cp LambdaDeployment%version%.zip %url_bucket%LambdaDeployment%version%.zip
del LambdaDeployment%version%.zip

: Deploy stack
cd ../iac
aws cloudformation deploy --template "lambda-deployment.json" --stack-name "deployment-custom-resources" --parameter-overrides KeyFileLambdaDeployment=LambdaDeployment%version%.zip Project=itorvo GeneracionLogs=false --capabilities CAPABILITY_NAMED_IAM

cd ..

aws s3 rm %url_bucket%LambdaDeployment%version%.zip