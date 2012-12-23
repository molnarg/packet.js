var tools = require('../tools')

function MACAddress(buffer, offset, length) {
  var address = tools.view(buffer, offset, length)

  return address
}

module.exports = MACAddress
