var through2 = require('through2');
var frameTransform = require('./frameTransform.js');
var processFrame = require('./processFrame.js');
var hpack = require('./hpack.js');
var context = require('./context.js');
var _ = require('./constants.js');

function describeFrame(frame, send) {
  var description = '';
  if (frame.type === _.TYPE_HEADERS && frame.data) {
    if (send) {
      description = frame.data[':status'];
    } else {
      description = frame.data[':method'] + ' ' + frame.data[':path'];
    }
  } else if (frame.type === _.TYPE_PRIORITY) {
    var dependedStreamId = frame.payload.readUInt32BE(0);
    var weight = frame.payload.readUInt8(1);
    description = 'id:' + dependedStreamId + ' weight:' + weight;
  } else if (frame.type === _.TYPE_PUSH_PROMISE) {//TODO
    var promisedStreamId = frame.payload.readUInt32BE(0);// TODO: padding
    description = frame.data[':method'] + ' ' + frame.data[':path'] + ' id:' + promisedStreamId;
  } else if (frame.type === _.TYPE_RST_STREAM) {//TODO
    var errorCode = frame.payload.readUInt32BE(0);// TODO: padding
    description = _.ERROR_NAME[errorCode];
  }
  return description;
}

function serverLog(context, frame, send, changes) {
  var frameName = _.FRAME_NAME[frame.type];
  var sendName = send ? 'send' : 'recv';
  var description = describeFrame(frame, send);
  var state = context.streams[frame.streamId].state;
  console.log('[' + frame.streamId + ':' + state + '] ' + sendName + ' ' + frameName + ' ' + description);
};

function simpleLog(from, to) {

  var serverContext = context();
  var clientContext = context();

  var frameUpstream = frameTransform(true);
  var logUpstream = through2({
    objectMode: true
  }, function(frame, enc, callback) {
    var serverChanges = processFrame(serverContext, frame);
    processFrame(clientContext, frame, true);
    serverLog(serverContext, frame, false, serverChanges);
    callback();
  });
  var frameDownstream = frameTransform();
  var logDownstream = through2({
    objectMode: true
  }, function(frame, enc, callback) {
    var serverChanges = processFrame(serverContext, frame, true);
    processFrame(clientContext, frame);
    serverLog(serverContext, frame, true, serverChanges);
    callback();
  });

  from.pipe(frameUpstream).pipe(logUpstream); // upstream
  to.pipe(frameDownstream).pipe(logDownstream); // downstream
}

module.exports = simpleLog;