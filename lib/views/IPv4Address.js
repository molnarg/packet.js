var Structure = require('../Structure')

function IPv4Address(parent, offset) {
  Structure.call(this, parent, offset)
}

IPv4Address.structure = {
  0: 1, 1: 1, 2: 1, 3: 1,

  toString: {
    value: function() {
      return [this[0], this[1], this[2], this[3]].join('.')
    }
  }
}

IPv4Address.prototype = Structure.create(Structure.prototype, IPv4Address.structure)

module.exports = IPv4Address
