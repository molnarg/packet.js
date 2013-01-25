var Template = require('../Template')
  , PcapRecord = require('./PcapRecord')
  , linktypes = require('../tables/pcap_linktypes')

function PcapFile(parent, offset) {
  Template.call(this, parent, offset)
}

PcapFile.structure = {
  magic_number:  { size: 4, little_endian: true },
  little_endian: {
    get: function() { return this.magic_number === 0xa1b2c3d4 },
    set: function(value) { this.magic_number = value ? 0xa1b2c3d4 : 0xd4c3b2a1 }
  },

  version_major: { size: 2, little_endian: 'little_endian' },
  version_minor: { size: 2, little_endian: 'little_endian' },
  thiszone:      { size: 4, little_endian: 'little_endian' },
  sigfigs:       { size: 4, little_endian: 'little_endian' },
  snaplen:       { size: 4, little_endian: 'little_endian' },
  network:       { size: 4, little_endian: 'little_endian', domain: linktypes },

  packets: { array: { view: PcapRecord } }
}

PcapFile.prototype = Template.create(Template.prototype, PcapFile.structure)

module.exports = PcapFile
