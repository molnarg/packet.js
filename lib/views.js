var bt = require('bt')

var viewlist =
  [ 'ARPPacket'
  , 'EthernetFrame'
  , 'IPv4Packet'
  , 'IPv4Address'
  , 'MACAddress'
  , 'TCPSegment'
  , 'UDPDatagram'
  , 'Text'
  , 'PcapRecord'
  , 'DNSPacket'
  , 'DomainName'
  , 'PcapFile'
  , 'ICMPPacket'
  , 'LinuxCookedPacket'
  ]

var view_properties = {
  View     : { value: bt.View },
  Template : { value: bt.Template },
  List     : { value: bt.List }
}

viewlist.forEach(function(name) {
  view_properties[name] = { configurable: true, get: function() {
    var View = require('./views/' + name)

    // Once loaded, define it as a simple value property. The next access will be much faster.
    Object.defineProperty(this, name, { value: View })

    return View
  }}
})

module.exports = Object.create(Object.prototype, view_properties)