@echo off
set CUR_HH=%time:~0,2%
if %CUR_HH% lss 10 (set CUR_HH=0%time:~1,1%)
set version=%CUR_HH%%time:~3,2%%time:~6,2%
set bucket=test-my-bucket-aws
set url_bucket=s3://%bucket%/
echo %version%
: Deploy stack
aws cloudformation deploy --template "template.json" --stack-name "test-api2" --parameter-overrides DeploymentTime=%version% AllowLogs=1