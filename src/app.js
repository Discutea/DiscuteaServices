var loader = require("./autoloader");
var s = new loader.Protocol.ircClient();

s.connect();

s.addListener('ping', function (data) {
    console.log('test listener => ' + data);
});


//if (Math.floor(Date.now() / 1000))
s.addListener('user_connect', function (u) {
    console.log('user => ' + u.nick);
});


