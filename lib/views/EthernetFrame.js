var tools = require('../tools')
  , MACAddress = require('./MACAddress.js')

var ethertypes = {
  0x0800: 'ip',
  0x0806: 'arp'
}

var properties = {
  type: tools.field(12, 0, 16),

  protocol: { value: 'ethernet' },

  payloadProtocol: {
    get: function() {
      return ethertypes[this.type]
    },
    set: function(value) {
      for (var type in ethertypes) if (ethertypes[type] === value) return this.type = Number(type)
    }
  }
}

function EthernetFrame(buffer, offset, length) {
  var frame = tools.view(buffer, offset, length)

  Object.defineProperties(frame, properties)
  Object.defineProperties(frame, {
    source:      { value: MACAddress(frame.buffer, frame.byteOffset + 0, 6) },
    destination: { value: MACAddress(frame.buffer, frame.byteOffset + 6, 6) },
    payload:     { value: tools.view(frame.buffer, frame.byteOffset + 14) }
  })

  return frame
}

module.exports = EthernetFrame
