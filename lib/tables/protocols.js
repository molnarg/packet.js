// protocol id -> view name
module.exports = {
  ethernet: 'EthernetFrame',
  ipv4    : 'IPv4Packet',
  tcp     : 'TCPSegment',
  udp     : 'UDPDatagram',
  arp     : 'ARPPacket',
  pcap    : 'PcapRecord',
  dns     : 'DNSPacket',
  icmp    : 'ICMPPacket'
}
