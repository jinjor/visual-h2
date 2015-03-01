var React = require('react/addons');
var Path = require('path');
var __dirname = require('./util.js').dirname;
var cx = React.addons.classSet;
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var childProcess = require('child_process');

var storage = assign(new EventEmitter(), {
	events: [],
	pushEvent: function(e) {
		this.events = React.addons.update(this.events, {$push: [e]});
		if(this.rendering) {
			this.skipped = true;
			return;
		}
		this.rendering = true;
		setTimeout(function() {
			this.emit('change');
		}.bind(this), 100);
	},
	notifyRenderingFinished: function() {//TODO
		if(this.skipped) {
			this.emit('change');
		}
		this.skipped = false;
		this.rendering = false;
	},
	getEvents: function() {
		return this.events;
	}
});

var n = childProcess.fork(__dirname + '/server.js');
n.on('message', storage.pushEvent.bind(storage));
n.on('error', function(e) {
	console.log(e);
});


var transfer = function(event, prev) {
	var streamId = event.streamId;
	var state = event.state;
	var send = event.send;
	var frameType = event.frameType;
	var message = event.message;

	var streams = prev.streams.concat(); // clone
	var matchedIndex = -1;
	for (var i = 0; i < streams.length; i++) {
		if (streams[i] && streams[i].state === 'closed') {
			streams[i] = null;
		}
		if (!streams[i] && matchedIndex === -1) {
			matchedIndex = i;
		}
		if (streams[i] && streams[i].id === streamId) {
			matchedIndex = i;
		}
		if (streams[i] && streams[i].id !== streamId) {
			streams[i] = {
				id: streams[i].id
			};
		}
	}
	if (matchedIndex >= 0) {
		streams[matchedIndex] = {
			id: streamId,
			state: state
		};
	}
	if (event.promisedStreamId) {
		for (var i = 0; i < streams.length; i++) {
			if (!streams[i]) {
				streams[i] = {
					id: event.promisedStreamId,
					// state: state,
					from: matchedIndex
				};
				// streams[matchedIndex].state = null;
				break;
			}
		}
	}

	var data = {
		streams: streams,
		streamId: streamId,
		send: send,
		frameType: frameType,
		message: message
	};
	return data;
	
};


var Bar = React.createClass({displayName: "Bar",
	shouldComponentUpdate: function(nextProps, nextState) {
		return false;
	},
	render: function() {
		var cells = this.props.data.streams.map(function(stream, i) {
			var even = stream && stream.id !== 0 && stream.id % 2 === 0;
			var odd = stream && stream.id !== 0 && stream.id % 2 === 1;
			var classes = cx({
				'plot': true,
				'send': this.props.data.send
			});
			var plot = stream && stream.state ? React.createElement("div", {className: classes}) : null;
			var prevStream = this.props.prev.streams[i];
			var path = (prevStream && stream && prevStream.id === stream.id) ? React.createElement("div", {className: "path"}) : null;
			var promisePath = null;
			if (stream && stream.from) {
				var distance = i - stream.from;
				var style = {
					left: (10 - 20 * distance) + 'px',
					width: (20 * distance) + 'px'
				};
				promisePath = React.createElement("div", {className: "promise-path", style: style});
			}

			var classes = cx({
				'state': true,
				'even': even,
				'odd': odd
			});
			return (React.createElement("div", {key: i, className: "state"}, plot, path, promisePath));
		}.bind(this));
		return (
			React.createElement("div", {className: "bar"}, cells, 
				React.createElement("span", {className: "message-streamid"}, " ", '[' + this.props.data.streamId + '] '), 
				React.createElement("span", {className: "message-send"}, this.props.data.send ? 'send' : 'recv'), 
				React.createElement("span", {className: "message-type"}, " ", this.props.data.frameType, " "), 
				React.createElement("span", {className: "message"}, " ", this.props.data.message, " ")
			)
		);
	}
});


var App = React.createClass({displayName: "App",
	getInitialState: function() {
		return {
			events: storage.getEvents()
		};
	},
	componentDidMount: function() {
		storage.on('change', function() {
			React.addons.Perf.start();
			this.setState({
				events: storage.getEvents()
			}, function(){
				React.addons.Perf.stop();
				var last = React.addons.Perf.getLastMeasurements();
				// console.log(last);
				var map = React.addons.Perf.getMeasurementsSummaryMap(last);
			});
		}.bind(this));
	},
	componentDidUpdate: function(prevProps, prevState) {
		// console.log(map[0].Instances, map[0]['Owner > component'], map[0]['Wasted time (ms)']);
		setTimeout(function(){
			storage.notifyRenderingFinished();
		}, 100);
		window.scrollTo(0, window.document.documentElement.scrollHeight)
	},
	render: function() {
		var prev = {
			streams: [null, null, null, null, null, null, null, null, null, null,
				// null, null, null, null, null, null, null, null, null, null
			],
			message: ''
		};
		var timeline = this.state.events.map(function(event, i) {
			prev = transfer(event, prev);
			prev.id = i;
			return prev;
		}.bind(this));
		var bars = [];
		for (var i = 1; i < timeline.length; i++) {
			bars.push(React.createElement(Bar, {key: i, prev: timeline[i - 1], data: timeline[i]}));
		}
		return React.createElement("div", null, bars);
	}
});


React.render(React.createElement(App, null),
	window.document.getElementById('content')
);