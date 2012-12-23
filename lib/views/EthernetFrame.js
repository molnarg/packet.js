var tools = require('../tools')
  , MACAddress = require('./MACAddress.js')

var properties = {
  type: {
    get: function() { return tools.readUInt16BE(this, 12) },
    set: function(value) { tools.writeUInt16BE(this, value, 12) }
  }
}

function EthernetFrame(buffer, offset, length) {
  offset = offset || 0

  var frame = tools.view(buffer, offset, length)

  Object.defineProperties(frame, properties)
  Object.defineProperties(frame, {
    source:      { value: MACAddress(buffer, offset + 0, 6) },
    destination: { value: MACAddress(buffer, offset + 6, 6) }
  })

  return frame
}

module.exports = EthernetFrame
