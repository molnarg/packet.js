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
  ;[0,1,2,3,4,5].forEach(function(i) {
    properties[i] = {
      get: function() { return tools.readUInt8(this, i) },
      set: function(value) { tools.writeUInt8(this, value, i) }
    }
  })
}

function MACAddress(buffer, offset, length) {
  var address = tools.view(buffer, offset, length)

  Object.defineProperties(address, properties)

  return address
}

module.exports = MACAddress
