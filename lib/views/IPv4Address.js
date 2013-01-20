var Structure = require('../Structure')

function IPv4Address(parent, offset) {
  Structure.call(this, parent, offset)
}

IPv4Address.structure = {
  0: 1, 1: 1, 2: 1, 3: 1,

  toString: { value: function() {
    return [this[0], this[1], this[2], this[3]].join('.')
  }},

  set: { value: function(value) {
    if (typeof value === 'string') {
      var octets = value.split('.').map(Number)
      for (var i = 0; i < 4; i++) this[i] = octets[i]

    } else if (value instanceof IPv4Address) {
      this.setUint32(0, value.getUint32(0))
    }
  }}
}

IPv4Address.prototype = Structure.create(Structure.prototype, IPv4Address.structure)

module.exports = IPv4Address
