const index = require('../src/index')

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
const sinon = require('sinon');
const AWS = require('aws-sdk');

AWS.config.update({ region: "us-east-1" });
const dataEvent = {
  "Records": [
    {
      "body": "{ \"user\": \"test\", \"partitionDate\": \"hola\", \"message\": \"esto es una prueba\" }"
    }
  ]
}
let sinonSandbox;
describe('index.js', function () {
  beforeEach((done) => {
    sinonSandbox = sinon.createSandbox();
    done();
  })
  afterEach((done) => {
    sinonSandbox.restore();
    done();
  })

  it("Register Audit: Success", async () => {

    let dynamoPrototype = Object.getPrototypeOf(new AWS.DynamoDB.DocumentClient());

    sinonSandbox.stub(dynamoPrototype, 'put').returns({
      promise: function () {
        return Promise.resolve({});
      }
    });

    const result = await index.handler(dataEvent, null, null);
    expect(result).to.not.Throw;

  });

  it("Register Audit: Failed", async () => {

    let dynamoPrototype = Object.getPrototypeOf(new AWS.DynamoDB.DocumentClient());

    sinonSandbox.stub(dynamoPrototype, 'put').throws();

    await expect(index.handler(dataEvent, null, null)).to.be.rejectedWith(`Internal server error`);
  });
})
