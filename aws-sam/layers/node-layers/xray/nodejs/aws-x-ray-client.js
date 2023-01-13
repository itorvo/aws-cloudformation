const AWSXRay = require('aws-xray-sdk-core')

exports.getSDKXRay = () => {
  return AWSXRay;
}

exports.getAWSSDK = () => {
  return AWSXRay.captureAWS(require('aws-sdk'));
}

exports.captureHttpGlobal = () => {
  let http = require('http');
  AWSXRay.captureHTTPsGlobal(http);
  return http;
}

exports.captureHttpsGlobal = () => {
  let https = require('https');
  AWSXRay.captureHTTPsGlobal(https);
  return https;
}

exports.getSegment = () => {
  return AWSXRay.getSegment();
}

exports.addSubSegment = (label) => {
  return AWSXRay.getSegment().addNewSubsegment(label);
}

exports.closeSubSegment = (subsegment) => {
  subsegment.close();
}

exports.setMetadata = (segment, metadata) => {
  const properties = Object.keys(metadata);

  properties.forEach(property => {
    segment.addMetadata(property, metadata[property]);
  });
}

exports.setAnnotations = (segment, annotations) => {
  const properties = Object.keys(annotations);

  properties.forEach(property => {
    segment.addAnnotation(property, annotations[property]);
  });
}