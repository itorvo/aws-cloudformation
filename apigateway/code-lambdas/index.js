var axios = require('axios');

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

  return await axios(config)
    .then(function (response) {
      return response.data
    })
    .catch(function (error) {
      throw new Error('Se presentó un error');
    });
}