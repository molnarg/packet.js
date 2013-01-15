var viewlist =
  [ 'ARPPacket'
  , 'EthernetFrame'
  , 'IPv4Packet'
  , 'IPv4Address'
  , 'MACAddress'
  , 'TCPSegment'
  , 'UDPDatagram'
  ]

var view_properties = {}
viewlist.forEach(function(name) {
  view_properties[name] = { configurable: true, get: function() {
    var View = require('./views/' + name)

    // Once loaded, define it as a simple value property. The next access will be much faster.
    Object.defineProperty(this, name, { value: View })

    return View
  }}
})

module.exports = Object.create(Object.prototype, view_properties)