var tools = require('../tools')
  , View = require('../View')

function UDPDatagram(buffer, offset, length) {
  return View(UDPDatagram, buffer, offset, length)
}

UDPDatagram.structure = {
  srcport:  { length: 16 },
  dstport:  { length: 16 },
  len:      { length: 16 },
  checksum: { length: 16 },
  payload:  { length: 'len * 8 - 64' }
}

UDPDatagram.properties = {
  protocol: { value: 'udp' },

  toString: { value: function() {
    return 'UDP ' + this.srcport + ' -> ' + this.dstport
  } }
}

UDPDatagram.prototype = Object.create(View.prototype, tools.structure(UDPDatagram.structure))
Object.defineProperties(UDPDatagram.prototype, UDPDatagram.properties)

module.exports = UDPDatagram
