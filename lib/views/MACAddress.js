var Template = require('bt').Template

var hex = []
for (var i = 0; i < 256; i++) hex[i] = (0x100 + i).toString(16).substr(1).toUpperCase()

module.exports = Template.extend({
  0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1,

  toString: { value: function() {
    return [hex[this[0]], hex[this[1]], hex[this[2]], hex[this[3]], hex[this[4]], hex[this[5]]].join(':')
  }},

  set: { value: function(value) {
    if (typeof value === 'string') {
      var octets = value.split(':').map(function(hex) { return parseInt(hex, 16) })
      for (var i = 0; i < 6; i++) this[i] = octets[i]

    } else if (value instanceof MACAddress) {
      this.setUint32(0, value.getUint32(0))
      this.setUint16(4, value.getUint16(4))
    }
  }}
})
