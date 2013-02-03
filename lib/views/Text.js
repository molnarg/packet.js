var Template = Template = require('bt').Template

module.exports = Template.extend({
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
})
