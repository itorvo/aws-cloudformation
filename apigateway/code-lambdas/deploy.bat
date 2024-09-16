@echo off
set CUR_HH=%time:~0,2%
if %CUR_HH% lss 10 (set CUR_HH=0%time:~1,1%)
set version=%CUR_HH%%time:~3,2%%time:~6,2%
set bucket=ito-437950194672-lambda-deployments
set url_bucket=s3://%bucket%/

: Deploy Lambda authorizer
pip install --target ./package -r requirements.txt
cd package
zip -r ../lambda-authorizer-package%version%.zip .
cd ..
zip -g lambda-authorizer-package%version%.zip .\index.py
@REM aws s3 cp lambda-authorizer-package%version%.zip %url_bucket%lambda-authorizer-package%version%.zip
@REM del lambda-authorizer-package%version%.zip

: Deploy Lambda Backend
@REM call npm install
@REM zip -g lambda-back-package%version%.zip .\index.js
@REM zip -r lambda-back-package%version%.zip .\node_modules
@REM aws s3 cp lambda-back-package%version%.zip %url_bucket%lambda-back-package%version%.zip
@REM del lambda-back-package%version%.zip

@REM : Show S3 Key Files
@REM echo lambda-authorizer-package%version%.zip
@REM echo lambda-back-package%version%.zip