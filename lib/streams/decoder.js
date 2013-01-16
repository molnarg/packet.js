var util = require('util')
  , Stream = require('stream')
  , Packet = require('../Packet')

var Decoder = function (protocol) {
  this.protocol = protocol
}

util.inherits(Decoder, Stream)

Decoder.prototype.readable = true
Decoder.prototype.writable = true

Decoder.prototype.write = function (buffer) {
  this.emit('data', new Packet(buffer, this.protocol))
}

Decoder.prototype.end = function (buffer) {
  if (buffer) this.write(buffer)
  this.emit('end')
}

module.exports = function(protocol) {
  return new Decoder(protocol || 'ethernet')
}
