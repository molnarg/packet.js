var Structure = require('../Structure')

function hex(value) {
  return (0x100 + value).toString(16).substr(1).toUpperCase()
}

function MACAddress(parent, offset) {
  Structure.call(this, parent, offset)
}

MACAddress.structure = {
  0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1,

  toString: {
    value: function(separator) {
      separator = separator || ':'
      return [this[0], this[1], this[2], this[3], this[4], this[5]].map(hex).join(separator)
    }
  }
}

MACAddress.prototype = Structure.create(Structure.prototype, MACAddress.structure)

module.exports = MACAddress
