var Packet = require('../Packet')
  , ethertypes = require('../tables/ethertypes')

module.exports = Packet.extend({
  type:             { size: 2 },
  arphrd:           { size: 2 },
  hw_size:          { size: 2 },
  hw_addr:          { size: 'this.hw_size', view: Packet.views.Template },
  padding:          { size: '8 - this.hw_size' },

  payload_protocol: { size: 2, domain: ethertypes },
  payload_view:     { view: Packet.views.Template },

  protocol:         { value: 'linux_cooked' }
})
