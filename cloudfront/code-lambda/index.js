// Lambda Edge Origin Request
'use strict';
exports.handler = (event, _context, callback) => {
  console.log(JSON.stringify(event));
  var request = event.Records[0].cf.request;
  var olduri = request.uri;
  var fileregex = /(\/[^\r\n]+\.+.+)+/;
  var newuri;
  let indexOf = olduri.indexOf('/');
  let lastIndexOf = olduri.lastIndexOf('/');
  if (fileregex.test(olduri)) newuri = olduri;
  else if (lastIndexOf == 0) newuri = olduri + '/index.html';
  else if (olduri.indexOf('/') != 0 && olduri.substring(indexOf + 1, lastIndexOf).indexOf('/') == -1) newuri = olduri + 'index.html';
  else {
    lastIndexOf = olduri.indexOf('/', indexOf + 1)
    newuri = olduri.substr(0, lastIndexOf + 1) + 'index.html';
  }
  console.log('Old URI: ' + olduri);
  console.log('New URI: ' + newuri);
  request.uri = newuri;
  return callback(null, request);
};