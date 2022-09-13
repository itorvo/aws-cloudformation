@echo off
set CUR_HH=%time:~0,2%
if %CUR_HH% lss 10 (set CUR_HH=0%time:~1,1%)
set version=%CUR_HH%%time:~3,2%%time:~6,2%
set bucket=test-my-bucket-aws
set url_bucket=s3://%bucket%/

: Deploy Lambda Edge
cd ./LambdaEdge
zip -g LambdaEdge%version%.zip .\index.js
aws s3 cp LambdaEdge%version%.zip %url_bucket%LambdaEdge%version%.zip
del LambdaEdge%version%.zip

: Deploy stack
cd ../iac
aws cloudformation deploy --template "lambda-edge.json" --stack-name "itorvo-lambda-edge" --parameter-overrides DeploymentTime=%version% KeyFileLambdaEdge=LambdaEdge%version%.zip Project=itorvo --capabilities CAPABILITY_NAMED_IAM

cd ..

aws s3 rm %url_bucket%LambdaEdge%version%.zip