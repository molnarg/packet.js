var ethertypes = require('../tables/ethertypes')
  , MACAddress = require('./MACAddress.js')
  , Template = require('../Template')
  , Packet = require('../Packet')

function EthernetFrame(parent, offset) {
  Packet.call(this, parent, offset)
}

EthernetFrame.structure = {
  destination:  MACAddress,
  source:       MACAddress,

  ethertype: [{
    type:       { size: 2, domain: ethertypes }
  }, {
    len:        { size: 2 }
  }],

  payload_view: { size: undefined },


  protocol: { value: 'ethernet' },

  payload_protocol: {
    get: function() { return this.type },
    set: function(value) { this.type = value }
  },

  toString: { value: function() {
    return 'Eth ' + this.source.toString() + ' -> ' + this.destination.toString()
  } }
}

EthernetFrame.prototype = Template.create(Packet.prototype, EthernetFrame.structure)

module.exports = EthernetFrame
