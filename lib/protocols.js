
module.exports = {
  ethernet: require('./views/EthernetFrame'),
  ipv4    : require('./views/IPv4Packet'),
  tcp     : require('./views/TCPSegment'),
  udp     : require('./views/UDPDatagram'),
  arp     : require('./views/ARPPacket')
}
