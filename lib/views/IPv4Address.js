var structure = require('../structure')
  , View = require('../View')

function IPv4Address(parent, offset) {
  View.call(this, parent, offset)
}

IPv4Address.properties = {
  toString: {
    value: function() {
      return [this[0], this[1], this[2], this[3]].join('.')
    }
  }
}

IPv4Address.structure = { 0: [8], 1: [8], 2: [8], 3: [8] }

IPv4Address.prototype = Object.create(View.prototype, structure(IPv4Address.structure))
Object.defineProperties(IPv4Address.prototype, IPv4Address.properties)

module.exports = IPv4Address
