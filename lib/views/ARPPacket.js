var tools = require('../tools')
  , ethertypes = require('./ethertypes')
  , View = require('../View')
  , IPv4Address = require('./IPv4Address')
  , MACAddress = require('./MACAddress')

var hardware_types = {
  1: 'ethernet',
  16: 'atm'
}

var opcodes = {
  1: 'request',
  2: 'reply'
}

var addresses = {
  ipv4: IPv4Address,
  ethernet: MACAddress
}

function ARPPacket(buffer, offset, length) {
  return View(ARPPacket, buffer, offset, length)
}

ARPPacket.structure = {
  hw_type:    { length: 16, domain: hardware_types },
  proto_type: { length: 16, domain: ethertypes },
  hw_size:    8,
  proto_size: 8,
  opcode:     { length: 16, domain: opcodes },

  src_hw:     { length: 'hw_size    * 8', type: function() { return addresses[this.hw_type   ] } },
  src_proto:  { length: 'proto_size * 8', type: function() { return addresses[this.proto_type] } },
  dst_hw:     { length: 'hw_size    * 8', type: function() { return addresses[this.hw_type   ] } },
  dst_proto:  { length: 'proto_size * 8', type: function() { return addresses[this.proto_type] } }
}

ARPPacket.properties = {
  protocol: { value: 'arp' }
}

ARPPacket.prototype = Object.create(View.prototype, tools.structure(ARPPacket.structure))
Object.defineProperties(ARPPacket.prototype, ARPPacket.properties)

module.exports = ARPPacket