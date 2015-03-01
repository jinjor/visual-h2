var childProcess = require('child_process');

function log(e) {
	var sendName = e.send ? 'send' : 'recv';
	console.log('[' + e.streamId + ':' + e.state + '] ' + sendName + ' ' + e.frameType + ' ' + e.message);
}

var n = childProcess.fork(__dirname + '/server.js');
n.on('message', log);
n.on('error', function(e) {
	console.log(e);
});