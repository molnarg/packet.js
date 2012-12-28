var tools = require('../tools')
  , MACAddress = require('./MACAddress.js')

var ethertypes = {
  0x0800: 'ip',
  0x0806: 'arp'
}

function EthernetFrame(buffer, offset, length) {
  var frame = tools.view(buffer, offset, length)

  Object.defineProperties(frame, EthernetFrame.properties)
  Object.defineProperties(frame, EthernetFrame.structure_properties)

  return frame
}

EthernetFrame.structure = {
  destination: { length: 48, type: MACAddress },
  source:      { length: 48, type: MACAddress },
  type:        16,
  payload:     undefined
}

EthernetFrame.structure_properties = tools.structure(EthernetFrame.structure)

EthernetFrame.properties = {
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

module.exports = EthernetFrame
