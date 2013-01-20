var Structure = require('../Structure')

function TCPSegment(parent, offset) {
  Structure.call(this, parent, offset)
}

TCPSegment.structure = {
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
  payload_view: { offset: 'hdr_len * 4' },


  protocol: { value: 'tcp' },

  toString: { value: function() {
    return ( 'TCP '
           + this.srcport + ' -> ' + this.dstport
           + ' ('
           + (this.flags.syn ? 'S' : ' ')
           + (this.flags.ack ? 'A' : ' ')
           + (this.flags.fin ? 'F' : ' ')
           + ')'
           )
  } }
}

TCPSegment.prototype = Structure.create(Structure.prototype, TCPSegment.structure)

module.exports = TCPSegment
