let axios = require('axios');

const AWSXRay = require('aws-xray-sdk-core')

let http = require('http');
let https = require('https');

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

exports.handler = async (event, context, callback) => {
  try {
    let data = event.headers.data;
    if (data === '1') {
      const pokemons = await getListPokemons(event.queryStringParameters.limit, event.queryStringParameters.page)
      return createResponse(200, pokemons);
    }
    else{
      const countries = await getAllCountries();
      return createResponse(200, countries)
    }
  }
  catch (ex) {
    return createResponse(500, null);
  }
};

function createResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    }
  };
}

async function getListPokemons(limit, page) {
  const url = `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${page}`;

  const instance = axios.create({
    httpAgent: new http.Agent(),
    httpsAgent: new https.Agent(),
  });

  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('ListPokemon');

  let data = await instance.get(url).then(function (response) {
    return response.data
  })
    .catch(function (error) {
      return null;
    });

  subsegment.close();

  return data;
}

async function getAllCountries() {

  const AWS = AWSXRay.captureAWS(require('aws-sdk'));
  let dynamoDbClient = new AWS.DynamoDB.DocumentClient();

  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('GetAllCountries');

  const params = {
    TableName: process.env.TableName
  };

  let items = await dynamoDbClient.scan(params).promise().then(function (data) {
    console.log(data)
    return data.Items;
  })
    .catch(function (err) {
      return null
    });

  subsegment.close();

  return items
}