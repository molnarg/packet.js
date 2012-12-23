var tools = require('../tools')

function hex(value) {
  return (0x100 + value).toString(16).substr(1).toUpperCase()
}

var properties = {
  toString: {
    value: function(separator) {
      separator = separator || ':'
      return [this[0], this[1], this[2], this[3], this[4], this[5]].map(hex).join(separator)
    }
  }
}

if (!tools.node) {
  for (var i = 0; i < 6; i++) properties[i] = tools.field(i, 0, 8)
}

function MACAddress(buffer, offset, length) {
  var address = tools.view(buffer, offset, length)

  Object.defineProperties(address, properties)

  return address
}

module.exports = MACAddress
