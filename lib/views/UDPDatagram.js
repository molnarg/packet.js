var Structure = require('../Structure')

function UDPDatagram(parent, offset) {
  Structure.call(this, parent, offset)
}

UDPDatagram.structure = {
  srcport:      { length: 16 },
  dstport:      { length: 16 },
  len:          { length: 16 },
  checksum:     { length: 16 },
  payload_view: { length: 'len * 8 - 64' },


  protocol: { value: 'udp' },

  toString: { value: function() {
    return 'UDP ' + this.srcport + ' -> ' + this.dstport
  } }
}

UDPDatagram.prototype = Structure.create(Structure.prototype, UDPDatagram.structure)

module.exports = UDPDatagram
