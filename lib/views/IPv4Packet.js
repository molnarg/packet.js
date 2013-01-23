var IPv4Address = require('./IPv4Address')
  , Template = require('../Template')
  , Packet = require('../Packet')

protocol_numbers = {
  1: 'icmp',
  6: 'tcp',
  17: 'udp'
}

function IPv4Packet(parent, offset) {
  Packet.call(this, parent, offset)
}

IPv4Packet.structure = {
  version:      4/8,
  hdr_len:      4/8,
  tos_field: [{
    dscp:       6/8,
    ecn:        2/8
  }, {
    tos:        8/8
  }],
  len:          2,
  id:           2,
  flags: {
    rb:         1/8,
    df:         1/8,
    mf:         1/8
  },
  frag_offset:  13/8,
  ttl:          1,
  proto:        { size: 1, domain: protocol_numbers },
  checksum:     2,
  src:          IPv4Address,
  dst:          IPv4Address,
  payload_view: { size: 'len - hdr_len * 4', offset: 'hdr_len * 4' },


  protocol: { value: 'ipv4' },

  payload_protocol: {
    get: function() { return this.proto },
    set: function(value) { this.proto = value }
  },

  toString: { value: function() {
    return 'IP ' + this.version + ' ' + this.src.toString() + ' -> ' + this.dst.toString()
  } }
}

IPv4Packet.prototype = Template.create(Packet.prototype, IPv4Packet.structure)

module.exports = IPv4Packet
