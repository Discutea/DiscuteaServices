var config = require('../conf/config.js');
var irc = require('./protocol/' + config.protocol.toLowerCase() + '.js');

var client = new irc.ircClient();
client.connect();
