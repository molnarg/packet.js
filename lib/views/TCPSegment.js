var structure = require('../structure')
  , View = require('../View')

function TCPSegment(buffer, offset, length) {
  return View(buffer, offset, length, TCPSegment)
}

TCPSegment.structure = {
  srcport:        [16],
  dstport:        [16],
  seq:            [32],
  ack:            [32],
  hdr_len:        [4],
  flags: {
    res:          [3],
    ns:           [1],
    cwr:          [1],
    ecn:          [1],
    urg:          [1],
    ack:          [1],
    push:         [1],
    reset:        [1],
    syn:          [1],
    fin:          [1]
  },
  window_size:    [16],
  checksum:       [16],
  payload:        [{ offset: 'hdr_len * 32' }]
}

TCPSegment.properties = {
  protocol: { value: 'tcp' },

  toString: { value: function() {
    return 'TCP ' + this.srcport + ' -> ' + this.dstport
  } }
}

TCPSegment.prototype = Object.create(View.prototype, structure(TCPSegment.structure))
Object.defineProperties(TCPSegment.prototype, TCPSegment.properties)

module.exports = TCPSegment
