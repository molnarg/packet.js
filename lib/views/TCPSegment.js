var tools = require('../tools')
  , View = require('../View')

function TCPSegment(buffer, offset, length) {
  return View(TCPSegment, buffer, offset, length)
}

TCPSegment.structure = {
  srcport:        16,
  dstport:        16,
  seq:            32,
  ack:            32,
  hdr_len:        4,
  flags_res:      3,
  flags_ns:       1,
  flags_cwr:      1,
  flags_ecn:      1,
  flags_urg:      1,
  flags_ack:      1,
  flags_push:     1,
  flags_reset:    1,
  flags_syn:      1,
  flags_fin:      1,
  window_size:    16,
  checksum:       16,
  payload:        { offset: 'hdr_len * 32' }
}

TCPSegment.properties = {
  protocol: { value: 'tcp' },

  toString: { value: function() {
    return 'TCP ' + this.srcport + ' -> ' + this.dstport
  } }
}

TCPSegment.prototype = Object.create(View.prototype, tools.structure(TCPSegment.structure))
Object.defineProperties(TCPSegment.prototype, TCPSegment.properties)

module.exports = TCPSegment
