var Template = require('../Template')

function Text(parent, offset) {
  Template.call(this, parent, offset)
}

Text.structure = {
  len:   { length: 8 },
  chars: [ 'len', { length: 8 } ],

  toString: { value: function() {
    return String.fromCharCode.apply(null, this.chars)
  }},

  set: { value: function(string) {
    this.len = string.length
    for (var i = 0; i < string.length; i++) {
      this.chars[i] = string.charCodeAt(i)
    }
  }}
}

Text.prototype = Template.create(Template.prototype, Text.structure)

module.exports = Text
