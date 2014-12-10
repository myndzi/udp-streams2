'use strict';

var Writable = require('stream').Writable,
    inherits = require('util').inherits,
    net = require('net'),
    dns = require('dns'),
    dgram = require('dgram');

function UdpStream() {
    Writable.call(this);

    this.socket = null;
    this.host = null;
    this.port = null;
}
inherits(UdpStream, Writable);

UdpStream.create = function (opts, cb) {
    var stream = new UdpStream();
    process.nextTick(function () {
        stream.connect(opts, cb);
    });
    return stream;
};

UdpStream.prototype.connect = function (opts, cb) {
    var self = this;

    var _onError = function (err) {
        if (typeof cb === 'function') { cb(err); }
        else { self.emit('error', err); }
    };
    var _onConnect = function () {
        if (typeof cb === 'function') { cb(null, self); }
        self.emit('connect', self);
    };
    
    if (typeof opts === 'function') {
        cb = opts;
        opts = { };
    } else {
        opts = opts || { };
    }
    
    if (!opts.host) { opts.host = '127.0.0.1'; }
    
    var connect = function () {
        if (net.isIPv4(opts.host)) {
            opts.type = 'udp4';
        } else if (net.isIPv6(opts.host)) {
            opts.type = 'udp6';
        } else {
            _onError(new Error('Invalid host: ' + opts.host));
            return;
        }
        
        if (!opts || !opts.host) { return _onError(new Error('opts.host is required')); }
        if (!opts || !opts.port) { return _onError(new Error('opts.port is required')); }
        
        try { self.socket = dgram.createSocket(opts.type); }
        catch (e) { return _onError(e); }
        
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
        
        _onConnect();
    };
    
    if (net.isIP(opts.host)) {
        connect();
    } else {
        dns.lookup(opts.host, function (err, res) {
            if (err) { return _onError(err); }
            opts.host = res;
            connect();
        });
    }
};

UdpStream.prototype.end = function () {
    UdpStream.super_.prototype.end.apply(this, arguments);
    this.socket.close();
};


UdpStream.prototype._write = function (chunk, encoding, callback) {
    this.socket.send(chunk, 0, chunk.length, this.port, this.host, callback);
};

module.exports = UdpStream;