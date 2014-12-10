'use strict';

var Writable = require('stream').Writable,
    inherits = require('util').inherits,
    net = require('net'),
    dns = require('dns'),
    dgram = require('dgram');



function UdpStream(opts) {
    Writable.call(this);

    this.socket = null;
    this.host = null;
    this.port = null;
}
inherits(UdpStream, Writable);

UdpStream.create = function (opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = { };
    } else {
        opts = opts || { };
    }
    
    var stream = new UdpStream();
    
    if (!opts.host) { opts.host = '127.0.0.1'; }
    
    var connect = function () {
        if (net.isIPv4(opts.host)) {
            opts.type = 'udp4';
        } else if (net.isIPv6(opts.host)) {
            opts.type = 'udp6';
        } else {
            cb(new Error('Invalid host: ' + opts.host));
            return;
        }
        
        stream._connect(opts, cb);
    };
    
    if (net.isIP(opts.host)) {
        connect();
    } else {
        dns.lookup(opts.host, function (err, res) {
            if (err) { cb(err); return; }
            opts.host = res;
            connect();
        });
    }
};
UdpStream.prototype._connect = function (opts, cb) {
    var self = this;
    
    try {
        self.socket = dgram.createSocket(opts.type);
    } catch (e) {
        cb(e);
        return;
    }
    
    self.host = opts.host;
    self.port = opts.port;
    
    // udp sockets can only be 'closed' manually, but we call
    // socket.close() in the 'end' method
    var onError, onClose, cleanup;

    onError = function (e) {
        cleanup();
        self.emit('error', e);
        self.end();
    };
    onClose = function () {
        cleanup();
    };
    cleanup = function () {
        self.socket.removeListener('error', onError);
        self.socket.removeListener('close', onClose);
    };
    
    self.socket.once('error', onError);
    self.socket.once('close', onClose);
    
    cb(null, self);
};

UdpStream.prototype.end = function () {
    UdpStream.super_.prototype.end.apply(this, arguments);
    this.socket.close();
};


UdpStream.prototype._write = function (chunk, encoding, callback) {
    this.socket.send(chunk, 0, chunk.length, this.port, this.host, callback);
};

module.exports = UdpStream;