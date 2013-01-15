var protocols = require('./tables/protocols')
  , views = require('./views')

module.exports = function(buffer, protocol) {
  var PacketView, packet, previousPacket = { payloadProtocol: protocol, payload: buffer }

  // Decode a protocol, then its payload, etc. while there is a payload with known protocol
  do {
    // Decoding the current protocol
    PacketView = views[protocols[protocol]]
    packet = new PacketView(previousPacket.payload)
    buffer[protocol] = packet

    // Defining this decoded part as the payload of the parent protocol
    //Object.defineProperty(previousPacket, 'payload', { value: packet })
    previousPacket = packet

    // The next protocol is the protocol of the current decoded protocol's payload. Only continue if we can decode it.
  } while ((protocol = packet.payloadProtocol) in protocols)

  return buffer
}
