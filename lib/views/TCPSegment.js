var tools = require('../tools')

function TCPSegment(buffer, offset, length) {
  var packet = tools.view(buffer, offset, length)

  Object.defineProperties(packet, TCPSegment.properties)
  Object.defineProperties(packet, TCPSegment.structure_properties)
  Object.defineProperties(packet, {
    payload: {
      value: tools.view(packet.buffer, packet.byteOffset + packet.hdr_len * 4),
      configurable: true,
      enumerable: true
    }
  })

  return packet
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

TCPSegment.structure_properties = tools.structure(TCPSegment.structure)

TCPSegment.properties = {
  protocol: { value: 'tcp' }
}

module.exports = TCPSegment
