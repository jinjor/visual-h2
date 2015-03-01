var React = require('react/addons');
var http2 = require('http2');
var tls = require('tls');
var fs = require('fs');
var Path = require('path');
var __dirname = require('./util.js').dirname;
var cx = React.addons.classSet;
var proxy = require('./proxy/index.js');
var _ = require('./proxy/constants.js');
var ecstatic = require('ecstatic');
var describeFrame = require('./describeFrame.js');
var autoPush = require('auto-push');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var childProcess = require('child_process');

var storage = assign(new EventEmitter(), {
  events: [],
  pushEvent: function(e) {
    console.log(e);
    return;
    this.events = React.addons.update(this.events, {$push: [e]});
    this.emit('change');
  },
  getEvents: function() {
    return this.events;
  }
});
console.log(__dirname + '/server.js');
var n = childProcess.fork(__dirname + '/server.js');
n.on('message', storage.pushEvent);
n.on('error', storage.pushEvent);