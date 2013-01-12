var util = require('util')
  , Stream = require('stream')

var Filter = function (filter) {
  this.filter = new Function('packet', 'with(packet) { return ' + filter + '}')
}

util.inherits(Filter, Stream)

Filter.prototype.readable = true
Filter.prototype.writable = true

Filter.prototype.write = function (packet) {
  try {
    var pass = this.filter(packet)
  } catch (e) {}

  if (pass) this.emit('data', packet)
}

Filter.prototype.end = function (packet) {
  if (packet) this.write(packet)
  this.emit('end')
}

module.exports = function(filter) {
  return new Filter(filter)
}
