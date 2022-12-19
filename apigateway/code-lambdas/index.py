import json
import time
import os
import urllib.request
from jose import jwk, jwt
from jose.utils import base64url_decode
import boto3
from boto3.dynamodb.conditions import Key
import re

def lambda_handler_dummy(event, context):
    try:
        token = event['headers']['Authorization']

        effect = int(token) % 2 == 0
        claims = None

        policy = policy_generator(event, claims, effect, False)
        return policy
    except:
        raise Exception('Unauthorized')

def lambda_handler(event, context):

    # Get environment variables - Deberá estar definido a nivel global
    region = os.environ.get("Region")
    userPoolId = os.environ.get("UserPoolId")
    clientId = os.environ.get("ClientId")
    tableName = os.environ.get("TableName")
    keys_url = 'https://cognito-idp.{}.amazonaws.com/{}/.well-known/jwks.json'.format(region, userPoolId)
    with urllib.request.urlopen(keys_url) as f: response = f.read()
    keys = json.loads(response.decode('utf-8'))['keys']
    # Get environment variables - Deberá estar definido a nivel global

    try:
        token = event['authorizationToken']

        claims = validate_signature(token)

        effect = claims != None and validate_expiration(claims['exp']) and validate_audience(claims['aud']) and validate_closed_ession(token)
        policy = policy_generator(event, claims, effect, True)
        return policy
    except:
        raise Exception('Unauthorized')

def validate_signature(token):
    # get the kid from the headers prior to verification
    headers = jwt.get_unverified_headers(token)
    kid = headers['kid']
    # search for the kid in the downloaded public keys
    key_index = -1
    for i in range(len(keys)):
        if kid == keys[i]['kid']:
            key_index = i
            break
    if key_index == -1: # Public key not found in jwks.json
        return None
    # construct the public key
    public_key = jwk.construct(keys[key_index])
    # get the last two sections of the token,
    # message and signature (encoded in base64)
    message, encoded_signature = str(token).rsplit('.', 1)
    # decode the signature
    decoded_signature = base64url_decode(encoded_signature.encode('utf-8'))
    # verify the signature
    if not public_key.verify(message.encode("utf8"), decoded_signature): #S ignature verification failed
        return None
    # since we passed the verification, we can now safely
    # use the unverified claims
    # Signature successfully verified
    return jwt.get_unverified_claims(token)

def validate_expiration(exp):
    return time.time() <= exp

def validate_audience(audience):
    return audience == clientId

def validate_closed_ession(token):
    dynamodb = boto3.resource('dynamodb')

    table = dynamodb.Table(tableName)
    response = table.query(KeyConditionExpression=Key('Token').eq(token))

    items = response['Items']
    return len(items) == 0

def policy_generator(event, claims, effect, addClaims):
    principalId = "***"

    tmp = event['methodArn'].split(':')
    apiGatewayArnTmp = tmp[5].split('/')
    awsAccountId = tmp[4]

    policy = AuthPolicy(principalId, awsAccountId)
    policy.restApiId = apiGatewayArnTmp[0]
    policy.region = tmp[3]
    policy.stage = apiGatewayArnTmp[1]
    
    context = {}

    if effect:
        policy.allowAllMethods()

        if addClaims:
            context["gender"] = claims["gender"]
            context["phone_number"] = claims["phone_number"]
            context["email"] = claims["email"]
            context["username"] = claims["cognito:username"]
    else:
        policy.denyAllMethods()

    authResponse = policy.build()
    if context != None:
        authResponse['context'] = context
    
    return authResponse

class HttpVerb:
    GET     = "GET"
    POST    = "POST"
    PUT     = "PUT"
    PATCH   = "PATCH"
    HEAD    = "HEAD"
    DELETE  = "DELETE"
    OPTIONS = "OPTIONS"
    ALL     = "*"

class AuthPolicy(object):
    awsAccountId = ""
    principalId = ""
    version = "2012-10-17"
    pathRegex = "^[/.a-zA-Z0-9-\*]+$"
    allowMethods = []
    denyMethods = []
    
    restApiId = "<<restApiId>>"

    region = "<<region>>"

    stage = "<<stage>>"

    def __init__(self, principal, awsAccountId):
        self.awsAccountId = awsAccountId
        self.principalId = principal
        self.allowMethods = []
        self.denyMethods = []

    def _addMethod(self, effect, verb, resource, conditions):
        if verb != "*" and not hasattr(HttpVerb, verb):
            raise NameError("Invalid HTTP verb " + verb + ". Allowed verbs in HttpVerb class")
        
        resourcePattern = re.compile(self.pathRegex)
        
        if not resourcePattern.match(resource):
            raise NameError("Invalid resource path: " + resource + ". Path should match " + self.pathRegex)

        if resource[:1] == "/":
            resource = resource[1:]

        resourceArn = ("arn:aws:execute-api:" +
            self.region + ":" +
            self.awsAccountId + ":" +
            self.restApiId + "/" +
            self.stage + "/*" +
            verb + "/" +
            resource)

        if effect.lower() == "allow":
            self.allowMethods.append({
                'resourceArn' : resourceArn,
                'conditions' : conditions
            })
        elif effect.lower() == "deny":
            self.denyMethods.append({
                'resourceArn' : resourceArn,
                'conditions' : conditions
            })

    def _getEmptyStatement(self, effect):
        statement = {
            'Action': 'execute-api:Invoke',
            'Effect': effect[:1].upper() + effect[1:].lower(),
            'Resource': []
        }

        return statement

    def _getStatementForEffect(self, effect, methods):
        statements = []

        if len(methods) > 0:
            statement = self._getEmptyStatement(effect)

            for curMethod in methods:
                if curMethod['conditions'] is None or len(curMethod['conditions']) == 0:
                    statement['Resource'].append(curMethod['resourceArn'])
                else:
                    conditionalStatement = self._getEmptyStatement(effect)
                    conditionalStatement['Resource'].append(curMethod['resourceArn'])
                    conditionalStatement['Condition'] = curMethod['conditions']
                    statements.append(conditionalStatement)

            statements.append(statement)

        return statements

    def allowAllMethods(self):
        self._addMethod("Allow", HttpVerb.ALL, "*", [])

    def denyAllMethods(self):
        self._addMethod("Deny", HttpVerb.ALL, "*", [])

    def allowMethod(self, verb, resource):
        self._addMethod("Allow", verb, resource, [])

    def denyMethod(self, verb, resource):
        self._addMethod("Deny", verb, resource, [])

    def allowMethodWithConditions(self, verb, resource, conditions):
        self._addMethod("Allow", verb, resource, conditions)

    def denyMethodWithConditions(self, verb, resource, conditions):
        self._addMethod("Deny", verb, resource, conditions)

    def build(self):
        if ((self.allowMethods is None or len(self.allowMethods) == 0) and
            (self.denyMethods is None or len(self.denyMethods) == 0)):
            raise NameError("No statements defined for the policy")

        policy = {
            'principalId' : self.principalId,
            'policyDocument' : {
                'Version' : self.version,
                'Statement' : []
            }
        }

        policy['policyDocument']['Statement'].extend(self._getStatementForEffect("Allow", self.allowMethods))
        policy['policyDocument']['Statement'].extend(self._getStatementForEffect("Deny", self.denyMethods))

        return policy