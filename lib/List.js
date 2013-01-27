var Template = require('./Template')
  , propertyExpression = require('./propertyExpression')

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
  // Default until function: go as far as possible
  if (!options.until && !options.length) options.until = function() {
    try {
      // Stop if the end of the array would be beyond the end of the buffer
      return this.root_offset + this.size + this.next.size > (this.root.length || this.root.byteLength)

    } catch (e) {
      if (e.name !== 'AssertionError') throw e
      // If e is 'AssertionError: Trying to read beyond buffer length' then stop
      return true
    }
  }

  function TypedList(parent, offset) {
    List.call(this, parent, offset)
  }

  var structure = {
    until: { value: options.until },
    close: { value: options.close }
  }

  for (var i = 0; i < 100; i++) structure[i] = options.array

  TypedList.prototype = Template.create(List.prototype, structure)

  if (options.length) propertyExpression(TypedList.prototype, 'length', options.length)

  return TypedList
}

module.exports = List
