var loader = require("./autoloader");

var s = new loader.Protocol.ircClient();

s.connect();

s.addListener('ping', function (data) {
    console.log('test listener => ' + data);
});
