'use strict';
exports.handler = (event, context, callback) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;
  headers['strict-transport-security'] = [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubdomains; preload' }];
  headers['x-permitted-cross-domain-policies'] = [ { key: 'x-permitted-cross-domain-policies', value: 'none' }];
  headers['content-security-policy'] = [{ key: 'Content-Security-Policy', value: "default-src 'self' *.googletagmanager.com *.google.com *.gstatic.com *.amazonaws.com; img-src 'self' *.orgfree.com; connect-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src *.google.com *.googletagmanager.com *.gstatic.com 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'self'" }];
  headers['x-content-type-options'] = [{ key: 'X-Content-Type-Options', value: 'nosniff' }];
  headers['x-frame-options'] = [{ key: 'X-Frame-Options', value: 'DENY' }];
  headers['x-xss-protection'] = [{ key: 'X-XSS-Protection', value: '1; mode=block' }];
  headers['referrer-policy'] = [{ key: 'Referrer-Policy', value: 'same-origin' }];
  headers['cache-control'] = [{ key: 'Cache-Control', value: 'no-store' }];
  headers['pragma'] = [{ key: 'Pragma', value: 'no-cache' }];
  headers['server'] = [{ key: 'Server', value: '-' }];
  callback(null, response);
};