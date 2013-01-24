var Template = require('../Template')

function Text(parent, offset) {
  Template.call(this, parent, offset)
}

Text.structure = {
  len:   { size: 1 },
  chars: {
    until: function() {
      return this.size === this.parent.len
    },
    close: function() {
      this.parent.len = this.size
    },
    array: { size: 1 }
  },

  toString: { value: function() {
    return String.fromCharCode.apply(null, this.chars)
  }},

  set: { value: function(string) {
    this.chars = Array.prototype.map.call(string, function(letter) { return letter.charCodeAt(0) })
  }}
}

Text.prototype = Template.create(Template.prototype, Text.structure)

module.exports = Text
