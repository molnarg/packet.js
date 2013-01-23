var Template = require('../Template')
  , Packet = require('../Template')

function UDPDatagram(parent, offset) {
  Packet.call(this, parent, offset)
}

UDPDatagram.structure = {
  srcport:      { size: 2 },
  dstport:      { size: 2 },
  len:          { size: 2 },
  checksum:     { size: 2 },
  payload_view: { size: 'len - 8' },


  protocol: { value: 'udp' },

  toString: { value: function() {
    return 'UDP ' + this.srcport + ' -> ' + this.dstport
  } }
}

UDPDatagram.prototype = Template.create(Packet.prototype, UDPDatagram.structure)

module.exports = UDPDatagram
