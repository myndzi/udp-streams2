'use strict';

var dgram = require('dgram'),
    UdpStream = require('./index');

var BIND_PORT = 1234;

require('should');

describe('UdpStream', function () {
    var server, server6,
        _onMessage = function () { };
    
    var onMessage = function (cb) { _onMessage = cb; }
    
    before(function (_done) {
        var count = 2;
        function done() {
            count--;
            if (!count) _done();
        };
        server = dgram.createSocket('udp4', function () {
            _onMessage.apply(null, arguments);
        });
        server.bind(BIND_PORT, done);
        
        server6 = dgram.createSocket('udp6', function () {
            _onMessage.apply(null, arguments);
        });
        server6.bind(BIND_PORT, done);
    });
    
    after(function () {
        server.close();
        server6.close();
    });
    afterEach(function () {
        onMessage(function () { });
    });
    
    it('should pass messages', function (done) {
        UdpStream.create({
            host: '127.0.0.1',
            port: BIND_PORT
        }, function (e, client) {
            if (e) { done(e); return; }

            onMessage(done.bind(null, null));
            
            client.write('hello');
        });
    });
    
    it('should support dns resolution', function (done) {
        UdpStream.create({
            host: 'localhost',
            port: BIND_PORT
        }, function (e, client) {
            if (e) { done(e); return; }

            onMessage(done.bind(null, null));
            
            client.write('hello');
        });
    });
    
    it('should support IPv6', function (done) {
        UdpStream.create({
            host: '::1',
            port: BIND_PORT
        }, function (e, client) {
            if (e) { done(e); return; }

            onMessage(done.bind(null, null));
            
            client.write('hello');
        });
    });

    it('should end gracefully', function (done) {
        UdpStream.create({
            host: 'localhost',
            port: BIND_PORT
        }, function (e, client) {
            if (e) { done(e); return; }
         
            client.end(done);
        });
    });
    
    it('should error on write after end', function () {
        UdpStream.create({
            host: 'localhost',
            port: BIND_PORT
        }, function (e, client) {
            if (e) { done(e); return; }
         
            client.end();
            (function () {
                client.write('foo');
            }).should.throw(/write after end/);
        });
    });
    
    it('should pass along socket errors and end', function (done) {
        UdpStream.create({
            host: 'localhost',
            port: BIND_PORT
        }, function (e, client) {
            if (e) { done(e); return; }
         
            var received = null;
            client.on('error', function (err) { received = err; });
            
            client.on('finish', function () {
                received.should.equal('fake');
                done();
            });

            client.socket.emit('error', 'fake');
        });
    });
    
    it('should fail if no port is provided', function (done) {
        UdpStream.create(function (err, res) {
            err.message.should.match(/opts\.port is required/);
            done();
        });
    });
    
    it('should not throw synchronously with invalid parameters', function () {
        UdpStream.create();
        UdpStream.create('foo');
        UdpStream.create(null);
        UdpStream.create(null, null);
        UdpStream.create({
            host: null,
            port: null
        });
    });
});