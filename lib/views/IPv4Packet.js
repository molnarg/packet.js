var tools = require('../tools')
  , IPv4Address = require('./IPv4Address')

protocol_numbers = {
  1: 'icmp',
  6: 'tcp',
  17: 'udp'
}

function IPv4Packet(buffer, offset, length) {
  var packet = tools.view(buffer, offset, length)

  Object.defineProperties(packet, IPv4Packet.properties)
  Object.defineProperties(packet, IPv4Packet.structure_properties)
  Object.defineProperties(packet, {
    payload: {
      value: tools.view(packet.buffer, packet.byteOffset + packet.ihl * 4),
      configurable: true
    }
  })

  return packet
}

IPv4Packet.structure = {
  version:     4,
  hdr_len:     4,
  tos_field: [{
    dscp:      6,
    ecn:       2
  }, {
    tos:       8
  }],
  len:         16,
  id:          16,
  flags: [{
    rb:        1,
    df:        1,
    mf:        1
  }],
  frag_offset: 13,
  ttl:         8,
  proto:       { length: 8 },
  checksum:    16,
  src:         { length: 32, type: IPv4Address },
  dst:         { length: 32, type: IPv4Address }
}

IPv4Packet.structure_properties = tools.structure(IPv4Packet.structure)

IPv4Packet.properties = {
  protocol: { value: 'ipv4' }
}

module.exports = IPv4Packet
