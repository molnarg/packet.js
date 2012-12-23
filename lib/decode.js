var protocols = require('./protocols')

module.exports = function(buffer, protocol) {
  var PacketView, packet, previousPacket, byteOffset, byteLength

  // Decode a protocol, then its payload, etc. while there is a payload with known protocol
  while (protocol && (protocol in protocols)) {
    // Decoding the current protocol
    PacketView = protocols[protocol]
    packet = PacketView(buffer, byteOffset, byteLength)
    buffer[protocol] = packet
    if (previousPacket) Object.defineProperty(previousPacket, 'payload', { value: packet })

    // Next protocol info
    protocol = packet.payloadProtocol
    if (packet.payload) {
      byteOffset = packet.payload.byteOffset
      byteLength = packet.payload.byteLength
    }
    previousPacket = packet
  }

  return buffer
}
