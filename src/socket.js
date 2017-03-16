exports.Socket = Socket;

var net  = require('net');
var tls  = require('tls');
var fs = require('fs');

function Socket(server, port, ssl = false) {
    if (!(this instanceof Socket)) { return new Socket(server, port, ssl); }

    this.server = server;
    this.port = port;
    this.ssl = ssl;
    this.conn = undefined;
    this.connect();
}

Socket.prototype.connect = function () {
    var that = this;
    if (this.ssl) {
        var conn = tls.connect(this.port, this.server, {rejectUnauthorized: false});

        conn.once('secureConnect', function(data){
            console.log('Starting the connection with tls ' + that.port + ' ' + that.server);
        });
    } else {
        conn = net.createConnection(this.port, this.server);
    }
    
    conn.on('error', function(err){
        console.log(err);
    });
    
    this.conn = conn;
    return conn;
}

Socket.prototype.write = function(args) { 
    if (typeof args !== 'object') {
        var args = Array.prototype.slice.call(arguments);
    }

    this.conn.write(args.join(' ') + '\r\n');
};
