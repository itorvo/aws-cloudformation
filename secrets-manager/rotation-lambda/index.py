# Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import logging
import os
import json
import requests


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    """Secrets Manager Rotation Template

    This is a template for creating an AWS Secrets Manager rotation lambda

    Args:
        event (dict): Lambda dictionary of event parameters. These keys must include the following:
            - SecretId: The secret ARN or identifier
            - ClientRequestToken: The ClientRequestToken of the secret version
            - Step: The rotation step (one of createSecret, setSecret, testSecret, or finishSecret)

        context (LambdaContext): The Lambda runtime information

    Raises:
        ResourceNotFoundException: If the secret with the specified arn and stage does not exist

        ValueError: If the secret is not properly configured for rotation

        KeyError: If the event parameters do not contain the expected keys

    """
    arn = event["SecretId"]
    token = event["ClientRequestToken"]
    step = event["Step"]

    # Setup the client
    # service_client = boto3.client('secretsmanager', endpoint_url=os.environ['SECRETS_MANAGER_ENDPOINT'])
    service_client = boto3.client("secretsmanager")

    # Make sure the version is staged correctly
    metadata = service_client.describe_secret(SecretId=arn)
    if not metadata["RotationEnabled"]:
        logger.error("Secret %s is not enabled for rotation" % arn)
        raise ValueError("Secret %s is not enabled for rotation" % arn)
    versions = metadata["VersionIdsToStages"]
    if token not in versions:
        logger.error(
            "Secret version %s has no stage for rotation of secret %s." % (token, arn)
        )
        raise ValueError(
            "Secret version %s has no stage for rotation of secret %s." % (token, arn)
        )
    if "AWSCURRENT" in versions[token]:
        logger.info(
            "Secret version %s already set as AWSCURRENT for secret %s." % (token, arn)
        )
        return
    elif "AWSPENDING" not in versions[token]:
        logger.error(
            "Secret version %s not set as AWSPENDING for rotation of secret %s."
            % (token, arn)
        )
        raise ValueError(
            "Secret version %s not set as AWSPENDING for rotation of secret %s."
            % (token, arn)
        )

    if step == "createSecret":
        create_secret(service_client, arn, token)

    elif step == "setSecret":
        set_secret(service_client, arn, token)

    elif step == "testSecret":
        test_secret(service_client, arn, token)

    elif step == "finishSecret":
        finish_secret(service_client, arn, token)

    else:
        raise ValueError("Invalid step parameter")


def create_secret(service_client, arn, token):
    """Create the secret

    This method first checks for the existence of a secret for the passed in token. If one does not exist, it will generate a
    new secret and put it with the passed in token.

    Args:
        service_client (client): The secrets manager service client

        arn (string): The secret ARN or other identifier

        token (string): The ClientRequestToken associated with the secret version

    Raises:
        ResourceNotFoundException: If the secret with the specified arn and stage does not exist

    """
    # Make sure the current secret exists
    service_client.get_secret_value(SecretId=arn, VersionStage="AWSCURRENT")

    # Now try to get the secret version, if that fails, put a new secret
    try:
        service_client.get_secret_value(SecretId=arn, VersionId=token, VersionStage="AWSPENDING")
        logger.info("createSecret: Successfully retrieved secret for %s." % arn)
    except service_client.exceptions.ResourceNotFoundException:
        # Get exclude characters from environment variable
        exclude_characters = (os.environ["EXCLUDE_CHARACTERS"] if "EXCLUDE_CHARACTERS" in os.environ else "/@\"'\\")
        # Generate a random password
        passwd = service_client.get_random_password(ExcludeCharacters=exclude_characters)

        secret_string =  '{"HEADERVALUE":"%s"}' %(passwd["RandomPassword"])

        # Put the secret
        service_client.put_secret_value(SecretId=arn, ClientRequestToken=token, SecretString=secret_string, VersionStages=["AWSPENDING"])
        
        logger.info("createSecret: Successfully put secret for ARN %s and version %s."% (arn, token))


def set_secret(service_client, arn, token):
    """Set the secret

    This method should set the AWSPENDING secret in the service that the secret belongs to. For example, if the secret is a database
    credential, this method should take the value of the AWSPENDING secret and set the user's password to this value in the database.

    Args:
        service_client (client): The secrets manager service client

        arn (string): The secret ARN or other identifier

        token (string): The ClientRequestToken associated with the secret version

    """
    # This is where the secret should be set in the service
    get_secret_value_result = service_client.get_secret_value(SecretId=arn, VersionId=token, VersionStage="AWSPENDING")
    secret_string = get_secret_value_result["SecretString"]
    secret_value = json.loads(secret_string)['HEADERVALUE']
    
    acl_id = os.environ.get("WAFACLID")
    distribution_id = os.environ.get("CFDISTROID")
    origin_id = os.environ.get("ORIGIID")
    custom_header_name = os.environ.get("HEADERNAME")

    acl_name = os.environ.get("WAFACLNAME")
    rule_id = os.environ.get("WAFACLRULEID")

    update_cloudfront_distribution(distribution_id, origin_id, custom_header_name, secret_value)

    update_waf_acl(acl_name, acl_id, rule_id, secret_value)

    logger.info("setSecret: Successfully update CloudFormation: %s." % (secret_value))


def update_cloudfront_distribution(distribution_id, origin_id, custom_header_name, custom_header_value):
    cloudfront = boto3.client('cloudfront')

    distribution = cloudfront.get_distribution(Id=distribution_id)

    distribution_config = distribution['Distribution']['DistributionConfig']

    origins = distribution_config['Origins']['Items']

    origin = next((origin for origin in origins if origin['Id'] == origin_id), None)

    custom_headers = origin['CustomHeaders']['Items']

    header = next((header for header in custom_headers if header['HeaderName'] == custom_header_name), None)
    header['HeaderValue'] = custom_header_value

    result = cloudfront.update_distribution(
        Id=distribution_id,
        DistributionConfig=distribution_config,
        IfMatch=distribution['ETag'],

    )

    return result


def update_waf_acl(acl_name, acl_id, rule_id, custom_header_value):
    waf = boto3.client('wafv2')

    acl = waf.get_web_acl(Name=acl_name, Scope='REGIONAL', Id=acl_id)
    
    rules = acl['WebACL']['Rules']

    rule = next((rule for rule in rules if rule['Name'] == rule_id), None)
    statements = rule['Statement']['OrStatement']['Statements']

    for statement in statements:
        statement['ByteMatchStatement']['SearchString'] = custom_header_value
    
    result = waf.update_web_acl(
        Name=acl_name,
        Scope='REGIONAL',
        Id=acl_id,
        DefaultAction=acl['WebACL']['DefaultAction'],
        VisibilityConfig=acl['WebACL']['VisibilityConfig'],
        Rules=acl['WebACL']['Rules'],
        LockToken=acl['LockToken'],
    )

    return result


def test_secret(service_client, arn, token):
    """Test the secret

    This method should validate that the AWSPENDING secret works in the service that the secret belongs to. For example, if the secret
    is a database credential, this method should validate that the user can login with the password in AWSPENDING and that the user has
    all of the expected permissions against the database.

    Args:
        service_client (client): The secrets manager service client

        arn (string): The secret ARN or other identifier

        token (string): The ClientRequestToken associated with the secret version

    """
    # This is where the secret should be tested against the service
    # value_result = service_client.get_secret_value(SecretId=arn, VersionId=token, VersionStage="AWSPENDING")
    # value = value_result["SecretString"]

    get_secret_value_result = service_client.get_secret_value(SecretId=arn, VersionId=token, VersionStage="AWSPENDING")
    secret_string = get_secret_value_result["SecretString"]
    secret_value = json.loads(secret_string)['HEADERVALUE']


    # HEADERNAME
    header_name = os.environ.get("HEADERNAME")
    api_endpoint = os.environ.get("APIENDPOINT")


    payload = {}
    headers = {
        header_name: secret_value
    }


    # response = requests.request("GET", api_endpoint, headers=headers, data=payload)


    # if response.status_code != 200:
    #     logger.error("setSecret: Error calling resource: %s." % (response))
    #     raise ValueError("setSecret: Error calling resource: %s." % (response))

    logger.info("setSecret: Successfully access resource: %s." % (response))


def finish_secret(service_client, arn, token):
    """Finish the secret

    This method finalizes the rotation process by marking the secret version passed in as the AWSCURRENT secret.

    Args:
        service_client (client): The secrets manager service client

        arn (string): The secret ARN or other identifier

        token (string): The ClientRequestToken associated with the secret version

    Raises:
        ResourceNotFoundException: If the secret with the specified arn does not exist

    """
    # First describe the secret to get the current version
    metadata = service_client.describe_secret(SecretId=arn)
    current_version = None
    for version in metadata["VersionIdsToStages"]:
        if "AWSCURRENT" in metadata["VersionIdsToStages"][version]:
            if version == token:
                # The correct version is already marked as current, return
                logger.info("finishSecret: Version %s already marked as AWSCURRENT for %s"% (version, arn))
                return
            current_version = version
            break

    # Finalize by staging the secret version current
    service_client.update_secret_version_stage(SecretId=arn, VersionStage="AWSCURRENT", MoveToVersionId=token, RemoveFromVersionId=current_version)
    logger.info("finishSecret: Successfully set AWSCURRENT stage to version %s for secret %s."% (token, arn))
