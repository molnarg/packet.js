var tools = require('../tools')
  , ethertypes = require('./ethertypes')
  , MACAddress = require('./MACAddress.js')
  , View = require('../View')

function EthernetFrame(buffer, offset, length) {
  return View(EthernetFrame, buffer, offset, length)
}

EthernetFrame.structure = {
  destination: { length: 48, type: MACAddress },
  source:      { length: 48, type: MACAddress },

  ethertype: [{
    type:      16
  }, {
    len:       16
  }],

  payload:     undefined
}

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

EthernetFrame.prototype = Object.create(View.prototype, tools.structure(EthernetFrame.structure))
Object.defineProperties(EthernetFrame.prototype, EthernetFrame.properties)

module.exports = EthernetFrame
