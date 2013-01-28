var IPv4Address = require('./IPv4Address')
  , Packet = require('../Packet')

protocol_numbers = {
  1: 'icmp',
  6: 'tcp',
  17: 'udp'
}

module.exports = Packet.extend({
  version:      4/8,
  hdr_len:      { size: 4/8, assert: function(value) { if (value < 5) return 'should be at least 5' } },
  tos_field: [{
    dscp:       6/8,
    ecn:        2/8
  }, {
    tos:        8/8
  }],
  len:          { size: 2, assert: function(value) { if (value <= this.hdr_len * 4) return 'should be more than hdr_len * 4' } },
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
})
