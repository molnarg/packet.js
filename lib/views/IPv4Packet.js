var tools = require('../tools')
  , IPv4Address = require('./IPv4Address')
  , View = require('../View')

protocol_numbers = {
  1: 'icmp',
  6: 'tcp',
  17: 'udp'
}

function IPv4Packet(buffer, offset, length) {
  return View(IPv4Packet, buffer, offset, length)
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
  proto:       { length: 8, domain: protocol_numbers },
  checksum:    16,
  src:         { length: 32, type: IPv4Address },
  dst:         { length: 32, type: IPv4Address },
  payload:     { offset: 'hdr_len * 32', length: 'len * 8 - hdr_len * 32' }
}

IPv4Packet.properties = {
  protocol: { value: 'ipv4' },

  payloadProtocol: {
    get: function() { return this.proto },
    set: function(value) { this.proto = value }
  },

  toString: { value: function() {
    return 'IP ' + this.src + ' -> ' + this.dst
  } }
}

IPv4Packet.prototype = Object.create(View.prototype, tools.structure(IPv4Packet.structure))
Object.defineProperties(IPv4Packet.prototype, IPv4Packet.properties)

module.exports = IPv4Packet
