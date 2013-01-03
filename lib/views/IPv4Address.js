var tools = require('../tools')
  , View = require('../View')

function IPv4Address(buffer, offset, length) {
  return View(buffer, offset, length, IPv4Address)
}

IPv4Address.properties = {
  toString: {
    value: function() {
      return [this[0], this[1], this[2], this[3]].join('.')
    }
  }
}

IPv4Address.structure = tools.node ? { } : { 0: 8, 1: 8, 2: 8, 3: 8 }

IPv4Address.prototype = Object.create(View.prototype, tools.structure(IPv4Address.structure))
Object.defineProperties(IPv4Address.prototype, IPv4Address.properties)

module.exports = IPv4Address
