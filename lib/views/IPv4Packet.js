var IPv4Address = require('./IPv4Address')
  , Packet = require('../Packet')
  , protocol_numbers = require('../tables/ip_protocol_numbers')

function hdr_len_assertion(value) {
  if (value < 5) throw new Error('hdr_len should be at least 5')
}

function len_assertion(value) {
  if (value <= this.hdr_len * 4) throw new Error('len should be more than hdr_len * 4')
}

module.exports = Packet.extend({
  version:      4/8,
  hdr_len:      { size: 4/8, assert: hdr_len_assertion },
  tos_field: [{
    dscp:       6/8,
    ecn:        2/8
  }, {
    tos:        8/8
  }],
  len:          { size: 2, assert: len_assertion },
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
  payload_view: { size: 'this.len - this.hdr_len * 4', offset: 'this.hdr_len * 4', view: Packet.views.Template },


  protocol: { value: 'ipv4' },

  payload_protocol: {
    get: function() { return this.proto },
    set: function(value) { this.proto = value }
  },

  toString: { value: function() {
    return 'IPv4 ' + this.src.toString() + ' -> ' + this.dst.toString() + ' | ' + this.payload.toString()
  } }
})
