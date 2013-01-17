var IPv4Address = require('./IPv4Address')
  , Structure = require('../Structure')

protocol_numbers = {
  1: 'icmp',
  6: 'tcp',
  17: 'udp'
}

function IPv4Packet(parent, offset) {
  Structure.call(this, parent, offset)
}

IPv4Packet.structure = {
  version:      4,
  hdr_len:      4,
  tos_field: [{
    dscp:       6,
    ecn:        2
  }, {
    tos:        8
  }],
  len:          16,
  id:           16,
  flags: {
    rb:         1,
    df:         1,
    mf:         1
  },
  frag_offset:  13,
  ttl:          8,
  proto:        { length: 8, domain: protocol_numbers },
  checksum:     16,
  src:          IPv4Address,
  dst:          IPv4Address,
  payload_view: { offset: 'hdr_len * 32', length: 'len * 8 - hdr_len * 32' },


  protocol: { value: 'ipv4' },

  payload_protocol: {
    get: function() { return this.proto },
    set: function(value) { this.proto = value }
  },

  toString: { value: function() {
    return 'IP ' + this.version + ' ' + this.src + ' -> ' + this.dst
  } }
}

IPv4Packet.prototype = Structure.create(Structure.prototype, IPv4Packet.structure)

module.exports = IPv4Packet
