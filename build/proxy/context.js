var _ = require('./constants.js');
var hpack = require('./hpack.js');

function createContext() {

  // var initialSettings = [];
  // initialSettings[_.SETTINGS_HEADER_TABLE_SIZE] = 4096;
  // initialSettings[_.SETTINGS_ENABLE_PUSH] = 1;
  // initialSettings[_.SETTINGS_MAX_CONCURRENT_STREAMS] = 1024;
  // initialSettings[_.SETTINGS_INITIAL_WINDOW_SIZE] = 65535;
  // initialSettings[_.SETTINGS_MAX_FRAME_SIZE] = 16384;
  // initialSettings[_.SETTINGS_MAX_HEADER_LIST_SIZE] = Infinity;

  // var localSettings = initialSettings.concat(); //copy
  // var remoteSettings = initialSettings.concat(); //copy

  var context = {
    headers: [],
    localDecoder: hpack(4096),
    remoteDecoder: hpack(4096),
    streams: [{
      state: 'open'
    }]
  };
  return context;
}

module.exports = createContext;