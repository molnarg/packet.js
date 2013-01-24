var Template = require('../Template')

var simple_options = [0, 1]

function TCPOption(parent, offset) {
  Template.call(this, parent, offset)
}

TCPOption.structure = {
  kind: {
    copied: 1/8,
    class:  2/8,
    number: 5/8
  },

  len_size: {
    get: function() { return (simple_options.indexOf(Number(this.kind)) !== -1) ? 0 : 1 }
  },
  len:    { size: 'len_size' },

  data_size: {
    get: function() { return (simple_options.indexOf(Number(this.kind)) !== -1) ? 0 : this.len - 2 },
    set: function(value) { this.len = value + 2 }
  },
  data:   { size: 'data_size' }
}

TCPOption.prototype = Template.create(Template.prototype, TCPOption.structure)

module.exports = TCPOption
