'use strict';

module.exports.handler = async (event, context, _callback) => {

  const AWS = require("aws-sdk");
  const documentClient = new AWS.DynamoDB.DocumentClient();
  const auditTable = process.env.tableName;

  let item = JSON.parse(event.Records[0].body);

  const params = {
    TableName: auditTable,
    Item: item
  };

  try {
    await documentClient.put(params).promise();
  } catch (ex) {
    throw new Error(`Internal server error`);
  }
};
