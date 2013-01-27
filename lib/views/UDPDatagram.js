var Template = require('../Template')
  , Packet = require('../Packet')

function UDPDatagram(parent, offset) {
  Packet.call(this, parent, offset)
}

UDPDatagram.structure = {
  srcport:      { size: 2 },
  dstport:      { size: 2 },
  len:          { size: 2 },
  checksum:     { size: 2 },
  payload_view: { size: 'len - 8' },


  payload_protocol: { get: function() {
    if (this.srcport === 53 || this.dstport === 53) return 'dns'
  }},

  protocol: { value: 'udp', enumerable: true },

  toString: { value: function() {
    return 'UDP ' + this.srcport + ' -> ' + this.dstport
  } }
}

UDPDatagram.prototype = Template.create(Packet.prototype, UDPDatagram.structure)

module.exports = UDPDatagram
