var tools = require('../tools')

function hex(value) {
  return (0x100 + value).toString(16).substr(1).toUpperCase()
}

function MACAddress(buffer, offset, length) {
  var address = tools.view(buffer, offset, length)

  Object.defineProperties(address, MACAddress.properties)
  Object.defineProperties(address, MACAddress.structure_properties)

  return address
}

MACAddress.properties = {
  toString: {
    value: function(separator) {
      separator = separator || ':'
      return [this[0], this[1], this[2], this[3], this[4], this[5]].map(hex).join(separator)
    }
  }
}

MACAddress.structure = tools.node ? { } : { 0: 8, 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 }
MACAddress.structure_properties = tools.structure(MACAddress.structure)

module.exports = MACAddress
