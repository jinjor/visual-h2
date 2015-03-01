var _ = require('./proxy/constants.js');

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
  } else if (frame.type === _.TYPE_PUSH_PROMISE) { //TODO
    var promisedStreamId = frame.payload.readUInt32BE(0); // TODO: padding
    description = frame.data[':method'] + ' ' + frame.data[':path'] + ' id:' + promisedStreamId;
  } else if (frame.type === _.TYPE_RST_STREAM) { //TODO
    var errorCode = frame.payload.readUInt32BE(0); // TODO: padding
    description = _.ERROR_NAME[errorCode];
  }
  return description;
}

module.exports = describeFrame;