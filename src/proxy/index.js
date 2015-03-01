var h2Proxy = require('../../h2-proxy/index.js');
var fs = require('fs');
var through2 = require('through2');
var frameTransform = require('./frameTransform.js');
var processFrame = require('./processFrame.js');
var hpack = require('./hpack.js');
var context = require('./context.js');
var _ = require('./constants.js');

function process(from, to, onAction) {

  var serverContext = context();
  var clientContext = context();

  var frameUpstream = frameTransform(true);
  var logUpstream = through2({
    objectMode: true
  }, function(frame, enc, callback) {
    var serverChanges = processFrame(serverContext, frame);
    processFrame(clientContext, frame, true);
    onAction(serverContext, frame, false, serverChanges);
    callback();
  });
  var frameDownstream = frameTransform();
  var logDownstream = through2({
    objectMode: true
  }, function(frame, enc, callback) {
    var serverChanges = processFrame(serverContext, frame, true);
    processFrame(clientContext, frame);
    onAction(serverContext, frame, true, serverChanges);
    callback();
  });

  from.pipe(frameUpstream).pipe(logUpstream); // upstream
  to.pipe(frameDownstream).pipe(logDownstream); // downstream
}

function start(fromOptions, toOptions, callback) {

  console.log('start proxy server from ' + fromOptions.port + ' to ' + toOptions.port);

  h2Proxy.start({
    from: fromOptions,
    to: toOptions,
    pipe: function(from, to) {
      from.pipe(to); // upstream
      to.pipe(from); // downstream
      process(from, to, callback);
    }
  });
};

module.exports = {
  start: start
};