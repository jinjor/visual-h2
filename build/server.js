var http2 = require('http2');
var tls = require('tls');
var fs = require('fs');
var Path = require('path');
var __dirname = require('./util.js').dirname;
var proxy = require('./proxy/index.js');
var _ = require('./proxy/constants.js');
var ecstatic = require('ecstatic');
var describeFrame = require('./describeFrame.js');
var autoPush = require('auto-push');


var tlsOptions = {
	key: fs.readFileSync(__dirname + '/../ssl/key.pem'),
	cert: fs.readFileSync(__dirname + '/../ssl/cert.pem')
};

http2.createServer(tlsOptions, ecstatic(__dirname + '/public')).listen(8443);

proxy.start({
	port: 8080,
	tlsOptions: {
		key: fs.readFileSync(__dirname + '/../ssl/key.pem'),
		cert: fs.readFileSync(__dirname + '/../ssl/cert.pem')
	}
}, {
	port: 8443,
	tlsOptions: {
		cert: fs.readFileSync(__dirname + '/../ssl/cert.pem'),
		ca: fs.readFileSync(__dirname + '/../ssl/cert.pem'),
		servername: 'localhost',
		rejectUnauthorized: false
	}
}, function(context, frame, send, changes) {
	var frameName = _.FRAME_NAME[frame.type];
	var description = describeFrame(frame, send);
	var state = context.streams[frame.streamId].state;
	var sendName = send ? 'send' : 'recv';

	var event = {
		streamId: frame.streamId,
		state: state,
		send: send,
		frameType: frameName, //TODO
		message: description
	};

	if (frame.type === _.TYPE_PUSH_PROMISE) {
		event.promisedStreamId = frame.payload.readUInt32BE(0); // TODO: padding
	}

	process.send(event);
});