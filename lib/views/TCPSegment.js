var Packet = require('../Packet')
  , Template = require('bt').Template
  , TCPOption = require('./TCPOption')
  , IPv4Address = require('./IPv4Address')
  , checksum = require('../algorithms/rfc1071')

var PseudoHeader = Template.extend({
  src:      IPv4Address,
  dst:      IPv4Address,
  zeros:    1,
  protocol: 1,
  length:   2,

  sum: { value: function() {
    // checksum  === 0xffff - sum
    // sum       === 0xffff - checksum
    return 0xffff - checksum(this.root, 0, this.size)
  }}
})
var pseudo_header = new PseudoHeader(new Buffer(12))

module.exports = Packet.extend({
  srcport:      2,
  dstport:      2,
  seq:          4,
  ack:          4,
  hdr_len:      4/8,
  flags: {
    res:        3/8,
    ns:         1/8,
    cwr:        1/8,
    ecn:        1/8,
    urg:        1/8,
    ack:        1/8,
    push:       1/8,
    reset:      1/8,
    syn:        1/8,
    fin:        1/8
  },
  window_size:  2,
  checksum:     2,
  urgent_ptr:   2,

  options: {
    until: function() {
      return (this.size === this.parent.hdr_len * 4 - this.offset) || this.next.kind == 0
    },
    close: function() {
      var hdr_len = (this.offset + this.size) / 4
      if (hdr_len % 1 !== 0) this.next.kind = 0
      this.parent.hdr_len = Math.ceil(hdr_len)
    },
    array: { view: TCPOption }
  },

  payload_view: { offset: 'hdr_len * 4' },

  finalize: { value: function(options) {
    var size = this.size

    pseudo_header.set({
      src: options.src || this.parent.src.toString(),
      dst: options.dst || this.parent.dst.toString(),
      zeros: 0,
      protocol: 6, // See IP protocol numbers in ../tables/ip_protocol_numbers
      length: size
    })

    this.checksum = pseudo_header.sum()
    this.checksum = checksum(this.root, this.root_offset, size)
  }},

  protocol: { value: 'tcp' },

  toString: { value: function() {
    return ( 'TCP '
           + this.srcport + ' -> ' + this.dstport
           + ' ('
           + (this.flags.syn ? 'S' : ' ')
           + (this.flags.ack ? 'A' : ' ')
           + (this.flags.fin ? 'F' : ' ')
           + ')'
           ) +
           (this.payload ? (' | ' + this.payload.toString()) : '')
  }}
})
