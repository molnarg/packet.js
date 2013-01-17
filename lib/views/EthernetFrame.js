var ethertypes = require('../tables/ethertypes')
  , MACAddress = require('./MACAddress.js')
  , Structure = require('../Structure')

function EthernetFrame(parent, offset) {
  Structure.call(this, parent, offset)
}

EthernetFrame.structure = {
  destination:  { type: MACAddress },
  source:       { type: MACAddress },

  ethertype: [{
    type:       { length: 16, domain: ethertypes }
  }, {
    len:        { length: 16 }
  }],

  payload_view: { length: undefined },


  protocol: { value: 'ethernet' },

  payload_protocol: {
    get: function() { return this.type },
    set: function(value) { this.type = value }
  },

  toString: { value: function() {
    return 'Eth ' + this.source + ' -> ' + this.destination
  } }
}

EthernetFrame.prototype = Structure.create(Structure.prototype, EthernetFrame.structure)

module.exports = EthernetFrame
