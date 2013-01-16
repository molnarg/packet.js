var ethertypes = require('../tables/ethertypes')
  , MACAddress = require('./MACAddress.js')
  , View = require('../View')
  , Structure = require('../Structure')

function EthernetFrame(parent, offset) {
  View.call(this, parent, offset)
}

EthernetFrame.structure = {
  destination: [{ length: 48, type: MACAddress }],
  source:      [{ length: 48, type: MACAddress }],

  ethertype: [{
    type:      [{ length: 16, domain: ethertypes }]
  }, {
    len:       [16]
  }],

  payload_view: [undefined]
}

EthernetFrame.properties = {
  protocol: { value: 'ethernet' },

  payload_protocol: {
    get: function() { return this.type },
    set: function(value) { this.type = value }
  },

  toString: { value: function() {
    return 'Eth ' + this.source + ' -> ' + this.destination
  } }
}

EthernetFrame.prototype = new Structure(undefined, undefined, EthernetFrame.structure)
Object.defineProperties(EthernetFrame.prototype, EthernetFrame.properties)

module.exports = EthernetFrame
