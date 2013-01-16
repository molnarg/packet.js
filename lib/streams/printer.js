var util = require('util')
  , Stream = require('stream')

var Printer = function () {
}

util.inherits(Printer, Stream)

Printer.prototype.writable = true
Printer.prototype.readable = true

Printer.prototype.write = function (packet) {
  var protocol = packet[packet.protocol], parts = []

  do {
    parts.push(String(protocol))
  } while (protocol = protocol.payload)

  this.emit('data', parts.join(' | ') + '\n')
}

Printer.prototype.end = function (packet) {
  if (packet) this.write(packet)
  this.emit('end')
}

module.exports = function() {
  return new Printer()
}
