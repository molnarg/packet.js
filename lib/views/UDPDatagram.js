var Packet = require('../Packet')

module.exports = Packet.extend({
  srcport:      { size: 2 },
  dstport:      { size: 2 },
  len:          { size: 2 },
  checksum:     { size: 2 },
  payload_view: { size: 'len - 8', view: Packet.views.View },


  payload_protocol: { get: function() {
    if (this.srcport === 53 || this.dstport === 53) return 'dns'
  }},

  protocol: { value: 'udp', enumerable: true },

  toString: { value: function() {
    return 'UDP ' + this.srcport + ' -> ' + this.dstport +
           (this.payload ? (' | ' + this.payload.toString()) : '')
  } }
})
