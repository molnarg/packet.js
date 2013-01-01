
module.exports = {
  ethernet: require('./views/EthernetFrame'),
  ipv4    : require('./views/IPv4Packet'),
  tcp     : require('./views/TCPSegment'),
  arp     : require('./views/ARPPacket')
}
