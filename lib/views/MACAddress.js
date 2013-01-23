var Template = require('../Template')
  , Packet = require('../Packet')

function hex(value) {
  return (0x100 + value).toString(16).substr(1).toUpperCase()
}

function MACAddress(parent, offset) {
  Packet.call(this, parent, offset)
}

MACAddress.structure = {
  0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1,

  toString: { value: function() {
    return [this[0], this[1], this[2], this[3], this[4], this[5]].map(hex).join(':')
  }},

  set: { value: function(value) {
    if (typeof value === 'string') {
      var octets = value.split(':').map(function(hex) { return parseInt(hex, 16) })
      for (var i = 0; i < 6; i++) this[i] = octets[i]

    } else if (value instanceof MACAddress) {
      this.setUint32(0, value.getUint32(0))
      this.setUint16(4, value.getUint16(4))
    }
  }}
}

MACAddress.prototype = Template.create(Packet.prototype, MACAddress.structure)

module.exports = MACAddress
