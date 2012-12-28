var tools = require('../tools')

function IPv4Address(buffer, offset, length) {
  var address = tools.view(buffer, offset, length)

  Object.defineProperties(address, IPv4Address.properties)
  Object.defineProperties(address, IPv4Address.structure_properties)

  return address
}

IPv4Address.properties = {
  toString: {
    value: function() {
      return [this[0], this[1], this[2], this[3]].join('.')
    }
  }
}

IPv4Address.structure = tools.node ? { } : { 0: 8, 1: 8, 2: 8, 3: 8 }
IPv4Address.structure_properties = tools.structure(IPv4Address.structure)

module.exports = IPv4Address
