import json
import time
import os
import urllib.request
from jose import jwk, jwt
from jose.utils import base64url_decode
import boto3
from boto3.dynamodb.conditions import Key
import re

def lambda_handler(event, context):
  token = event['headers']['Authorization']


  policy = 'Hola Mundo, Mundial'
  return policy