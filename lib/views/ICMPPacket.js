var Packet = require('../Packet')
  , Template = require('../Template')
  , checksum = require('../algorithms/rfc1071')

var details = {
  0: Template.extend({
    id:  2,
    seq: 2
  })
}

// Echo and echo reply have the same structure
details[8] = details[0]

module.exports = Packet.extend({
  type:      1,
  code:      1,
  checksum:  2,
  details:   { view: function() { return details[this.type] } },

  protocol: { value: 'icmp' },

  finalize: { value: function() {
    this.checksum = 0
    this.checksum = checksum(this.root, this.root_offset, this.size)
  }},

  toString: { value: function() {
    return 'ICMP ' + this.type
  } }
})
