var util = require('util')
  , Stream = require('stream')
  , Packet = require('../Packet')
  , views = require('../views')
  , protocols = require('../tables/protocols')

var Decoder = function (protocol) {
  this.protocol = protocol
  this.ViewClass = views[protocols[protocol]]
}

util.inherits(Decoder, Stream)

Decoder.prototype.readable = true
Decoder.prototype.writable = true

Decoder.prototype.write = function (buffer) {
  this.emit('data', new this.ViewClass(buffer))
}

Decoder.prototype.end = function (buffer) {
  if (buffer) this.write(buffer)
  this.emit('end')
}

module.exports = function(protocol) {
  return new Decoder(protocol || 'ethernet')
}
