var tools = require('../tools')
  , ethertypes = require('./ethertypes')
  , MACAddress = require('./MACAddress.js')
  , View = require('../View')

function EthernetFrame(buffer, offset, length) {
  return View(buffer, offset, length, EthernetFrame)
}

EthernetFrame.structure = {
  destination: { length: 48, type: MACAddress },
  source:      { length: 48, type: MACAddress },

  ethertype: [{
    type:      { length: 16, domain: ethertypes }
  }, {
    len:       16
  }],

  payload:     undefined
}

EthernetFrame.properties = {
  protocol: { value: 'ethernet' },

  payloadProtocol: {
    get: function() { return this.type },
    set: function(value) { this.type = value }
  },

  toString: { value: function() {
    return 'Eth ' + this.source + ' -> ' + this.destination
  } }
}

EthernetFrame.prototype = Object.create(View.prototype, tools.structure(EthernetFrame.structure))
Object.defineProperties(EthernetFrame.prototype, EthernetFrame.properties)

module.exports = EthernetFrame
