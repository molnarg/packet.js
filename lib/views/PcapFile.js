var Template = require('bt').Template
  , PcapRecord = require('./PcapRecord')
  , linktypes = require('../tables/pcap_linktypes')

module.exports = Template.extend({
  magic_number:  { size: 4, little_endian: true },
  little_endian: {
    get: function() { return this.magic_number === 0xa1b2c3d4 },
    set: function(value) { this.magic_number = value ? 0xa1b2c3d4 : 0xd4c3b2a1 }
  },

  version_major: { size: 2, little_endian: 'this.little_endian' },
  version_minor: { size: 2, little_endian: 'this.little_endian' },
  thiszone:      { size: 4, little_endian: 'this.little_endian' },
  sigfigs:       { size: 4, little_endian: 'this.little_endian' },
  snaplen:       { size: 4, little_endian: 'this.little_endian' },
  network:       { size: 4, little_endian: 'this.little_endian', domain: linktypes },

  packets: { array: { view: PcapRecord } }
})
