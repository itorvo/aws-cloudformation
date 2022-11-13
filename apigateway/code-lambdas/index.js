exports.handler = async (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify([{ "data": "hola" }]),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    }
  };

  return response;
};