var util = require('util')
  , Stream = require('stream')
  , decode = require('../decode')

var Decoder = function (protocol) {
  this.protocol = protocol
}

util.inherits(Decoder, Stream)

Decoder.prototype.readable = true
Decoder.prototype.writable = true

Decoder.prototype.write = function (buffer) {
  decode(buffer, this.protocol)

  this.emit('data', buffer)
}

Decoder.prototype.end = function (buffer) {
  if (buffer) this.write(buffer)
  this.emit('end')
}

module.exports = function(protocol) {
  return new Decoder(protocol || 'ethernet')
}
