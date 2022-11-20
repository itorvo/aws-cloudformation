var axios = require('axios');

const AWSXRay = require('aws-xray-sdk-core')
AWSXRay.captureHTTPsGlobal(require('http'));
var http = require('http');
var https = require('https');

exports.handler = async (event, context, callback) => {
  try {
    const list_pokemon = await getListPokemons(1, 0)
    return createResponse(200, list_pokemon);
  }
  catch (ex) {
    return createResponse(500, null);
  }
};

function createResponse(statusCode, body) {
  return response = {
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
  var config = {
    method: 'get',
    url: `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${page}`,
    headers: {}
  };

  const instance = axios.create({
    httpAgent: new http.Agent(),
    httpsAgent: new https.Agent(),
  });

  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('ListPokemon');

  let data = await instance.get(config.url).then(function (response) {
      return response.data
    })
    .catch(function (error) {
      return null;
    });

  subsegment.close();

  return data;
}