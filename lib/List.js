var Template = require('./Template')
  , propertyExpression = require('./propertyExpression')

function List(parent, offset) {
  Template.call(this, parent, offset)
  this.__last = 0
  this.__offset_0 = 0
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
    this.define(this.length)
    return this['__offset_' + length]
  }},

  length: { get: function(index) {
    Object.defineProperty(this, 'length', { value: 0, writable: true })

    while (!this.until()) this.length += 1

    var length = this.length
    delete this.length
    return length
  }},

  set: { value: function(array) {
    Object.defineProperty(this, 'length', { value: 0, writable: true, configurable: true })

    for (var i = 0; i < array.length; i++) {
      this[i] = array[i]
      this.length += 1
    }
    if (this.close) this.close()

    delete this.length
  }},

  define: { value: function(index) {
    var last = this.__last
    while (last < index) {
      this.__offset_item = this['__offset_' + last]
      delete this.__cached___size_item   // TODO: Make item (but only item) unstable
      this['__size_' + last] = this.__size_item
      this['__offset_' + (last + 1)] = this['__offset_' + last] + this['__size_' + last]
      last += 1
    }
    if (!this.unstable) this.__last = last

    return this['__offset_' + index]
  }},

  getItem: { value: function(index) {
    this.__offset_item = this.define(index)
    return this.item
  }},

  setItem: { value: function(index, value) {
    this.__offset_item = this.define(index)
    this.item = value
  }}
})

function defineDummyAccessor(object, index) {
  Object.defineProperty(object, index, {
    get: function() { return this.getItem(index) },
    set: function(value) { this.setItem(index, value) }
  })
}

for (var i = 0; i < 1000; i++) defineDummyAccessor(List.prototype, i)

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
    until: { value: options.until, configurable: true },
    close: { value: options.close, configurable: true },
    item: options.array
  }

  TypedList.prototype = Template.create(List.prototype, structure)
  delete TypedList.prototype.__last

  if (options.length) {
    propertyExpression(TypedList.prototype, 'length', options.length)
    Object.defineProperty(TypedList.prototype, 'close', { value: function() {
      var length = this.length
      delete this.length
      this.length = length
    }})
  }

  return TypedList
}

module.exports = List
