import boto3
from requests_aws4auth import AWS4Auth
import requests

# Configuración del dominio de OpenSearch
host = 'vpc-opensearch-dummy-ig6o6rp3znsnhklndwpxzebdfi.us-east-1.es.amazonaws.com'
region = 'us-east-1'
service = 'es'

# Obtener credenciales de AWS
session = boto3.Session()
credentials = session.get_credentials()

# Crear autenticación AWS SigV4
awsauth = AWS4Auth (
        credentials.access_key,
        credentials.secret_key,
        region,
        service,
        session_token=credentials.token
)

# Realizar la solicitud HTTP
url = f'https://{host}/_search'
headers = {'Content-Type': 'application/json'}
response = requests.get (url, auth=awsauth, headers=headers)

# Imprimir la respuesta
print (f'Status Code: [response,status_code)')
print(f'Response: {response.text}')