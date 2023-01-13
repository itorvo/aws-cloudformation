

exports.handler = async (event, context, callback) => {
  try {
    let data = parseInt(event.headers.data)
    const limit = parseInt(event.queryStringParameters.limit);
    const page = parseInt(event.queryStringParameters.page);
    if (data % 2 === 1) {
      const pokemons = await getListPokemons(limit, page)
      return createResponse(200, pokemons);
    }
    else {
      const countries = await getAllCountries(limit);
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

  let axios = require('axios');

  const XRayClient = require('/opt/nodejs/aws-x-ray-client')

  let http = XRayClient.captureHttpGlobal();
  let https = XRayClient.captureHttpsGlobal();

  const url = `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${page}`;

  const instance = axios.create({
    httpAgent: new http.Agent(),
    httpsAgent: new https.Agent(),
  });

  const subsegment = XRayClient.addSubSegment('ListPokemon');

  let data = await instance.get(url).then(function (response) {
    return response.data
  })
    .catch(function (error) {
      return null;
    });

  XRayClient.closeSubSegment(subsegment);

  return data;
}

async function getAllCountries(limit) {

  const XRayClient = require('/opt/nodejs/aws-x-ray-client')

  const AWS = XRayClient.getAWSSDK();

  let subsegment = configureXRaySubSegment(XRayClient, 'GetAllCountry', limit)

  let dynamoDbClient = new AWS.DynamoDB.DocumentClient();

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

  XRayClient.closeSubSegment(subsegment);

  return items
}

function configureXRaySubSegment(XRayClient, label, limit) {

  const subsegment = XRayClient.addSubSegment(label);

  XRayClient.setMetadata(subsegment,
    {
      limit: limit
    }
  )

  XRayClient.setAnnotations(subsegment,
    {
      limit: limit
    }
  )

  return subsegment;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}