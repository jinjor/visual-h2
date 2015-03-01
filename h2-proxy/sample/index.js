var fs = require('fs');
var httpProxy = require('http-proxy');
var http2 = require('http2');
var h2Proxy = require('../index.js');
var through2 = require('through2');
var ecstatic = require('ecstatic');
var simpleLog = require('./simpleLog.js');

// server

http2.createServer({
  key: fs.readFileSync(__dirname + '/ssl/key.pem'),
  cert: fs.readFileSync(__dirname + '/ssl/cert.pem'),
}, ecstatic(__dirname + '/public')).listen(8443);


// proxy

h2Proxy.start({
  from: {
    port: 8009,
    tlsOptions: {
      key: fs.readFileSync(__dirname + '/ssl/key.pem'),
      cert: fs.readFileSync(__dirname + '/ssl/cert.pem')
    }
  },
  to: {
    port: 8443,
    tlsOptions: {
      cert: fs.readFileSync(__dirname + '/ssl/cert.pem'),
      ca: fs.readFileSync(__dirname + '/ssl/cert.pem'),
      servername: 'localhost',
      rejectUnauthorized: false
    }
  },

  pipe: function(from, to) {
    from.pipe(to); // upstream
    to.pipe(from); // downstream
    simpleLog(from, to);
  }
});


