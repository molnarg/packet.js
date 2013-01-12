var util = require('util')
  , Stream = require('stream')

var Printer = function (protocol) {
  this.protocol = protocol
}

util.inherits(Printer, Stream)

Printer.prototype.writable = true
Printer.prototype.readable = true

Printer.prototype.write = function (packet) {
  var protocol = this.protocol, parts = []

  do {
    parts.push(String(packet[protocol]))
  } while (protocol = packet[protocol].payloadProtocol)

  this.emit('data', parts.join(' | ') + '\n')
}

Printer.prototype.end = function (packet) {
  if (packet) this.write(packet)
  this.emit('end')
}

module.exports = function(protocol) {
  return new Printer(protocol || 'ethernet')
}
