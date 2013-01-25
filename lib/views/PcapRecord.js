var Template = require('../Template')
  , Packet = require('../Packet')

function PcapRecord(parent, offset) {
  Packet.call(this, parent, offset)
}

PcapRecord.structure = {
  little_endian:    { get: function() { return this.parent.parent.little_endian } },

  ts_sec:           { size: 4, little_endian: 'little_endian' },
  ts_usec:          { size: 4, little_endian: 'little_endian' },
  incl_len:         { size: 4, little_endian: 'little_endian' },
  orig_len:         { size: 4, little_endian: 'little_endian' },

  payload_protocol: { get: function() { return this.parent.parent.network } },
  payload_view:     { size: 'incl_len' },

  protocol:         { value: 'pcap' }
}

PcapRecord.prototype = Template.create(Packet.prototype, PcapRecord.structure)

module.exports = PcapRecord
