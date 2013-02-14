var ethertypes = require('../tables/ethertypes')
  , MACAddress = require('./MACAddress.js')
  , Packet = require('../Packet')

module.exports = Packet.extend({
  destination:  MACAddress,
  source:       MACAddress,

  ethertype: [{
    type:       { size: 2, domain: ethertypes }
  }, {
    len:        { size: 2 }
  }],

  payload_view: { view: Packet.views.View },


  protocol: { value: 'ethernet' },

  payload_protocol: {
    get: function() { return this.type },
    set: function(value) { this.type = value }
  },

  toString: { value: function() {
    return 'Eth ' + this.source.toString() + ' -> ' + this.destination.toString() +
           ' | ' + this.payload.toString()
  } }
})
