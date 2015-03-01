var through2 = require('through2');

var PREFACE = new Buffer('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n');

function checkConnectionPreface(buf) {
  for (var i = 0; i < PREFACE.length; i++) {
    if (buf[i] !== PREFACE[i]) {
      throw new Error('Received invalid connection preface.');
    }
  }
}


function readFrame(buf) {
  //   0                   1                   2                   3
  //   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
  //  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  //  |                 Length (24)                   |
  //  +---------------+---------------+---------------+
  //  |   Type (8)    |   Flags (8)   |
  //  +-+-+-----------+---------------+-------------------------------+
  //  |R|                 Stream Identifier (31)                      |
  //  +=+=============================================================+
  //  |                   Frame Payload (0...)                      ...
  //  +---------------------------------------------------------------+
  var length = buf.readUInt32BE(0) >> 8;
  if (buf.length < 9 + length) {
    return null;
  }
  // console.log(buf.length, length);
  var type = buf.readUInt8(3);
  var flags = buf.readUInt8(4);
  var streamId = buf.readUInt32BE(5);
  var payload = buf.slice(9, 9 + length);
  return {
    type: type,
    flags: flags,
    streamId: streamId,
    payload: payload
  };
}

module.exports = function(willReceiveConnectionPreface) {
  
  var prev = new Buffer(0);

  return through2.obj(function(buf, enc, callback) {
    buf = Buffer.concat([prev, buf]);
    if (willReceiveConnectionPreface) {
      checkConnectionPreface(buf);
      willReceiveConnectionPreface = false;
      buf = buf.slice(PREFACE.length);
    }
    while (buf.length > 0) {
      var frame = readFrame(buf);
      if (!frame) {
        break;
      }
      buf = buf.slice(9 + frame.payload.length);
      this.push(frame);
    }
    prev = buf;
    callback();
  });
};