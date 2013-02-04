var Packet = require('../Packet')

module.exports = Packet.extend({
  little_endian:    { get: function() { return this.parent.parent.little_endian } },

  ts_sec:           { size: 4, little_endian: 'little_endian' },
  ts_usec:          { size: 4, little_endian: 'little_endian' },
  incl_len:         { size: 4, little_endian: 'little_endian' },
  orig_len:         { size: 4, little_endian: 'little_endian' },

  payload_protocol: { get: function() { return this.parent.parent.network } },
  payload_view:     { size: 'incl_len', view: Packet.views.View },

  protocol:         { value: 'pcap' }
})
