var structure = require('../structure')
  , View = require('../View')

function hex(value) {
  return (0x100 + value).toString(16).substr(1).toUpperCase()
}

function MACAddress(buffer, offset, length) {
  return View(buffer, offset, length, MACAddress)
}

MACAddress.properties = {
  toString: {
    value: function(separator) {
      separator = separator || ':'
      return [this[0], this[1], this[2], this[3], this[4], this[5]].map(hex).join(separator)
    }
  }
}

MACAddress.structure = View.node ? { } : { 0: [8], 1: [8], 2: [8], 3: [8], 4: [8], 5: [8] }

MACAddress.prototype = Object.create(View.prototype, structure(MACAddress.structure))
Object.defineProperties(MACAddress.prototype, MACAddress.properties)

module.exports = MACAddress
