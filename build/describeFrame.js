var _ = require('./proxy/constants.js');

function describeFrame(frame, send) {
  var description = '';
  if (frame.type === _.TYPE_DATA) {
    description = 'payload-size:' + frame.payload.length;
  } else if (frame.type === _.TYPE_HEADERS && frame.data) {
    if (send) {
      description = frame.data[':status'];
    } else {
      description = frame.data[':method'] + ' ' + frame.data[':path'];
    }
  } else if (frame.type === _.TYPE_PRIORITY) {
    var dependedStreamId = frame.payload.readUInt32BE(0);
    var weight = frame.payload.readUInt8(1);
    description = 'id:' + dependedStreamId + ' weight:' + weight;
  } else if (frame.type === _.TYPE_PUSH_PROMISE) { //TODO
    var padded = frame.flags & 0x8;
    var promisedStreamId = frame.payload.readUInt32BE(padded ? 1 : 0);
    description = frame.data[':method'] + ' ' + frame.data[':path'] + ' id:' + promisedStreamId;
  } else if (frame.type === _.TYPE_RST_STREAM) { //TODO
    var errorCode = frame.payload.readUInt32BE(0);
    description = _.ERROR_NAME[errorCode];
  } else if (frame.type === _.TYPE_WINDOW_UPDATE) {
    var windowSizeIncrement = frame.payload.readUInt32BE(0) << 1 >> 1;
    description = 'window-size-increment:' + windowSizeIncrement
  } else if (frame.type === _.TYPE_GOAWAY) {
    var lastStreamId = frame.payload.readUInt32BE(0);
    var errorCode = frame.payload.readUInt32BE(4);
    description = _.ERROR_NAME[errorCode] + ' last-stream-id:' + lastStreamId;
  }
  return description;
}

module.exports = describeFrame;