var ethertypes = require('../tables/ethertypes')
  , IPv4Address = require('./IPv4Address')
  , MACAddress = require('./MACAddress')
  , Structure = require('../Structure')

var hardware_types = {
  1: 'ethernet',
  16: 'atm'
}

var opcodes = {
  1: 'request',
  2: 'reply'
}

var addresses = {
  ipv4: IPv4Address,
  ethernet: MACAddress
}

function ARPPacket(parent, offset) {
  Structure.call(this, parent, offset)
}

ARPPacket.structure = {
  hw_type:    { size: 2, domain: hardware_types },
  proto_type: { size: 2, domain: ethertypes },
  hw_size:    { size: 1 },
  proto_size: { size: 1 },
  opcode:     { size: 2, domain: opcodes },

  src_hw:     { size: 'hw_size   ', type: function() { return addresses[this.hw_type   ] } },
  src_proto:  { size: 'proto_size', type: function() { return addresses[this.proto_type] } },
  dst_hw:     { size: 'hw_size   ', type: function() { return addresses[this.hw_type   ] } },
  dst_proto:  { size: 'proto_size', type: function() { return addresses[this.proto_type] } },


  protocol:   { value: 'arp' }
}

ARPPacket.prototype = Structure.create(Structure.prototype, ARPPacket.structure)

module.exports = ARPPacket
