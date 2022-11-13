@echo off
set bucket=ito-437950194672-archetypes
set url_bucket=s3://%bucket%/

zip -r front.zip index.html
zip -g front.zip buildspect.yml
aws s3 cp front.zip %url_bucket%front.zip
del front.zip