var Template = require('./Template')

function List(parent, offset) {
  Template.call(this, parent, offset)
}

List.prototype = Object.create(Template.prototype, {
  last: { get: function() {
    return this[this.length - 1]
  }},

  next: { get: function() {
    return this[this.length]
  }},

  size: { get: function() {
    var length = this.length
    return length && this['__offset_' + (length - 1)] + this['__size_' + (length - 1)]
  }},

  length: { get: function(index) {
    Object.defineProperty(this, 'length', { value: 0, writable: true })

    while (!this.until()) this.length += 1

    var length = this.length
    delete this.length
    return length
  }},

  set: { value: function(array) {
    Object.defineProperty(this, 'length', { value: 0, writable: true })

    for (var i = 0; i < array.length; i++) {
      this[i] = array[i]
      this.length += 1
    }
    this.close()

    delete this.length
  }}
})

List.extend = function(options) {
  function TypedList(parent, offset) {
    List.call(this, parent, offset)
  }

  var structure = {
    until: { value: options.until },
    close: { value: options.close }
  }

  for (var i = 0; i < 100; i++) structure[i] = options.array

  TypedList.prototype = Template.create(List.prototype, structure)

  return TypedList
}

module.exports = List
