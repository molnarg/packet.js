var tools = require('../tools')
  , View = require('../View')

function TCPSegment(buffer, offset, length) {
  var segment = View(TCPSegment, buffer, offset, length)

  Object.defineProperties(segment, {
    payload: {
      value: tools.view(segment.buffer, segment.byteOffset + segment.hdr_len * 4),
      configurable: true,
      enumerable: true
    }
  })

  return segment
}

TCPSegment.structure = {
  srcport:        16,
  dstport:        16,
  seq:            32,
  ack:            32,
  hdr_len:        4,
  flags: [{
    res:          3,
    ns:           1,
    cwr:          1,
    ecn:          1,
    urg:          1,
    ack:          1,
    push:         1,
    reset:        1,
    syn:          1,
    fin:          1
  }],
  window_size:    16,
  checksum:       16
}

TCPSegment.properties = {
  protocol: { value: 'tcp' }
}

TCPSegment.prototype = Object.create(View.prototype, tools.structure(TCPSegment.structure))
Object.defineProperties(TCPSegment.prototype, TCPSegment.properties)

module.exports = TCPSegment
