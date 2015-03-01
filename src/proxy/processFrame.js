var through2 = require('through2');
var _ = require('./constants.js');

module.exports = function(context, frame, send) {
  context.streams[frame.streamId] = context.streams[frame.streamId] || {
    state: 'idle'
  };
  read(context, frame, send);
  var changes = updateStream(context, frame, send);
  return changes;
};

function readHeaderBlockFragment(frame) {
  var padded = frame.type === _.TYPE_CONTINUATION ? 0 : frame.flags & 0x8;
  var priority = (frame.type === _.TYPE_CONTINUATION || frame.type === _.TYPE_PUSH_PROMISE) ?
    0 : frame.flags & 0x20;
  var offset = 0;
  offset += padded ? 1 : 0;
  offset += priority ? 5 : 0;
  if (frame.type === _.TYPE_PUSH_PROMISE) {
    offset += 4;
  }
  var padLength = 0;
  if (padded) {
    padLength = frame.payload.readUInt8(0);
  }
  return frame.payload.slice(offset, offset + frame.payload.length - padLength);
}

function isEndStream(frame) {
  return (frame.type === _.TYPE_HEADERS || frame.type === _.TYPE_DATA) && !!(frame.flags & 0x1);
}

function read(context, frame, send) {
  if (frame.type === _.TYPE_HEADERS || frame.type === _.TYPE_PUSH_PROMISE || frame.type === _.TYPE_CONTINUATION) {
    context.headers.push(frame);

    if (frame.flags & 0x4) {
      var fragments = [];
      for (var i = 0; i < context.headers.length; i++) {
        fragments.push(readHeaderBlockFragment(context.headers[i]));
      }
      context.headers.length = 0;
      var headerBlock = Buffer.concat(fragments);
      var headers = (send ? context.remoteDecoder : context.localDecoder).decode(headerBlock);
      data = {};
      headers.forEach(function(pair) {
        data[pair[0]] = pair[1];
      });
      frame.data = data;
    }
  }
};

function updateStream(context, frame, send) {

  if (frame.type === _.TYPE_CONTINUATION) {
    return;
  }
  var change1 = null;
  var change2 = null;

  var state = context.streams[frame.streamId].state;
  var endStream = isEndStream(frame);

  if (frame.type === _.TYPE_PUSH_PROMISE) {
    var padded = !!(frame.flags & 0x8);
    var reservedStreamId = padded ? frame.payload.readUInt32BE(1) : frame.payload.readUInt32BE(0);
    if (send) {
      change1 = [reservedStreamId, 'reserved-local'];
    } else {
      change1 = [reservedStreamId, 'reserved-remote'];
    }
  } else if (!state || state === 'idle') {
    if (frame.type === _.TYPE_HEADERS) {
      change1 = [frame.streamId, 'open'];
    }
  } else if (state === 'reserved-local') {
    if (frame.type === _.TYPE_RST_STREAM) {
      change1 = [frame.streamId, 'closed'];
    } else if (send && frame.type === _.TYPE_HEADERS) {
      change1 = [frame.streamId, 'half-closed-remote'];
    }
  } else if (state === 'reserved-remote') {
    if (frame.type === _.TYPE_RST_STREAM) {
      change1 = [frame.streamId, 'closed'];
    } else if (!send && frame.type === _.TYPE_HEADERS) {
      change1 = [frame.streamId, 'half-closed-local'];
    }
  } else if (state === 'open') {
    if (frame.type === _.TYPE_RST_STREAM) {
      change1 = [frame.streamId, 'closed'];
    }
  } else if (state === 'half-closed-remote') {
    if (frame.type === _.TYPE_RST_STREAM) {
      change1 = [frame.streamId, 'closed'];
    }
  } else if (state === 'half-closed-local') {
    if (frame.type === _.TYPE_RST_STREAM) {
      change1 = [frame.streamId, 'closed'];
    }
  }

  if (change1) {
    context.streams[change1[0]] = context.streams[change1[0]] || {
      state: 'idle'
    }
    context.streams[change1[0]].state = change1[1];
  }

  state = context.streams[frame.streamId].state;

  // endStream
  if (state === 'open') {
    if (!send && endStream) {
      change2 = [frame.streamId, 'half-closed-remote'];
    } else if (send && endStream) {
      change2 = [frame.streamId, 'half-closed-local'];
    }
  } else if (state === 'half-closed-remote') {
    if (send && endStream) {
      change2 = [frame.streamId, 'closed'];
    }
  } else if (state === 'half-closed-local') {
    if (!send && endStream) {
      change2 = [frame.streamId, 'closed'];
    }
  }

  if (change2) {
    context.streams[change2[0]] = context.streams[change2[0]] || {
      state: 'idle'
    }
    context.streams[change2[0]].state = change2[1];
  }

  var changes = [];
  change1 && changes.push(change1);
  change2 && changes.push(change2);
  return changes;
};