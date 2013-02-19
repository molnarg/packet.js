var Packet = require('../Packet')
  , ethertypes = require('../tables/ethertypes')
  , arphrd_types = require('../tables/arphrd_types')
  , protocol_addresses = require('../tables/protocol_addresses')
  , views = require('../views')

// Reference: http://www.tcpdump.org/linktypes/LINKTYPE_LINUX_SLL.html

var type_string = {
  0: '-> us', // Sent to us
  1: '-> bc', // Broadcast by sy. else
  2: '-> mc', // Multicast by sy. else
  3: '->   ', // Sent by sy. else to sy. else
  4: 'us ->'  // Sent by us
}

module.exports = Packet.extend({
  type:             { size: 2 },
  network:          { size: 2, domain: arphrd_types },
  address_size:     { size: 2 },
  address:          { size: 'this.address_size', view: function() { return views[protocol_addresses[this.network]] } },
  padding:          { size: '8 - this.address_size' },

  payload_protocol: { size: 2, domain: ethertypes },
  payload_view:     { view: Packet.views.Template },

  protocol:         { value: 'linux_cooked' },

  toString: { value: function() {
    return 'LC (' + this.network + ') ' + this.address.toString() + ' ' + type_string[this.type] +
           ' | ' + this.payload.toString()
  }}
})
