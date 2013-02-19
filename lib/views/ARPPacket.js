var ethertypes = require('../tables/ethertypes')
  , Packet = require('../Packet')
  , views = require('../views')
  , addresses = require('../tables/protocol_addresses')
  , arphrd_types = require('../tables/arphrd_types')

var opcodes = {
  1: 'request',
  2: 'reply'
}

module.exports = Packet.extend({
  hw_type:    { size: 2, domain: arphrd_types },
  proto_type: { size: 2, domain: ethertypes },
  hw_size:    { size: 1 },
  proto_size: { size: 1 },
  opcode:     { size: 2, domain: opcodes },

  src_hw:     { size: 'this.hw_size   ', view: function() { return views[addresses[this.hw_type   ]] } },
  src_proto:  { size: 'this.proto_size', view: function() { return views[addresses[this.proto_type]] } },
  dst_hw:     { size: 'this.hw_size   ', view: function() { return views[addresses[this.hw_type   ]] } },
  dst_proto:  { size: 'this.proto_size', view: function() { return views[addresses[this.proto_type]] } },

  protocol:   { value: 'arp' },

  toString:   { value: function() {
    if (this.opcode === 'request') {
      return 'ARP: Who has ' + this.dst_proto.toString() + '? Tell ' + this.src_proto.toString()
    } else {
      return 'ARP: ' + this.src_proto.toString() + ' is at ' + this.dst_hw.toString()
    }
  }}
})
