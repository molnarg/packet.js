var Template = require('bt').Template
  , Text = require('./Text')

var DomainName = module.exports = Template.extend({
  labels: {
    array: { view: Text },
    until: function() {
      return this.next.len === 0 || this.next.len >= 192
    },
    close: function() {
      this.next.len = 0
    }
  },

  end:         { size: 2/8 },

  branches: [{
    end:       { is: 0 },
    padding:   { size: 6/8 }
  }, {
    end:       { is: 3 },
    pointer:   { size: 14/8 }
  }],

  // Base address of the pointer, compared to the beginning of the DomainName structure
  pointer_base: {
    get: function() {
      return -1 * (this.offset + this.parent.offset + this.parent.parent.offset)
    }
  },

  toString: { value: function() {
    var name = Array.prototype.join.call(this.labels, '.')
      , pointer = this.pointer

    if (pointer) {
      if (name.length > 0) name += '.'
      name += String(new DomainName(this.parent, this.offset + this.pointer_base + pointer))
    }
    return name
  }},

  set: { value: function(domain) {
    this.labels = domain.split('.')
  }}
})
