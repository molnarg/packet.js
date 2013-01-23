var View = require('./View')

function Template(parent, offset) {
  View.call(this, parent, offset)
}

Template.prototype = Object.create(View.prototype, {
  __size_undefined: { value: 0 },
  __offset_undefined: { value: 0 },

  size: { get: function() {
    return (this['__offset_' + this.__last] + this['__size_' + this.__last])
  }},

  valueOf: { value: function() {
    var size = this.size
    return (size <= 4) ? this['getUint' + size * 8](0) : undefined
  }},

  set: { value: function(values) {
    if (typeof values === 'object') {
      for (var key in values) {
        this[key] = values[key]
      }

    } else if (typeof values === 'number' && this.size <= 4) {
      this['setUint' + (this.size * 8)](0, values)
    }
  }}
})

Template.defineProperty = function(object, name, desc) {
  if (desc instanceof Array) {
    if (desc.every(function(item) { return typeof item === 'object' })) {
      defineParallelProperties(object, name, desc)

    } else {
      defineArrayProperty(object, name, desc)
    }

  } else if (typeof desc === 'function' || (typeof desc === 'object' && desc.view instanceof Function)) {
    defineTypedProperty(object, name, desc)

  } else if (typeof desc === 'number' || 'size' in desc || 'offset' in desc) {
    defineBitfieldProperty(object, name, desc)

  } else if ('value' in desc || 'get' in desc || 'set' in desc) {
    Object.defineProperty(object, name, desc)

  } else {
    defineNestedProperties(object, name, desc)
  }
}

Template.defineProperties = function(object, properties) {
  var names = properties._order || Object.keys(properties)

  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    Template.defineProperty(object, name, properties[name])
  }
}

Template.create = function(prototype, descriptor) {
  var structure = Object.create(prototype)

  Template.defineProperties(structure, descriptor)

  return structure
}

// Return null if runtime property, and the constant value otherwise
function propertyExpression(object, name, expression) {
  if (!expression) return undefined

  var descriptor
  if (typeof expression === 'string') {
    // anonymous function-like string
    descriptor = { get: new Function('with(this) { return ' + expression + '}') }

  } else if (typeof expression === 'number') {
    // explicitly given number
    descriptor = { value: expression }

  } else if (expression instanceof Function) {
    var properties = Object.getOwnPropertyNames(expression.prototype)
    if (properties.length === 1 && properties[0] === 'constructor') {
      // expression is an anonymous function that returns the class
      descriptor = { get: expression }

    } else {
      // expression is a constructor function
      descriptor = { value: expression }
    }
  }

  // Simplifying if possible (if there's no reference error)
  if (descriptor.get) {
    try {
      descriptor = { value: descriptor.get.call(Object.create(object)) }
    } catch(e) {
      if (!(e instanceof ReferenceError)) throw e
    }
  }

  descriptor.configurable = true

  Object.defineProperty(object, name, descriptor)

  return ('value' in descriptor) ? descriptor.value : null
}

function defineBitfieldProperty(object, name, desc) {
  if (!(desc instanceof Object)) desc = { size: desc }

  var offset = '__offset_' + name, size = '__size_' + name
    , prev_offset = '__offset_' + object.__last, prev_size = '__size_' + object.__last

  propertyExpression(object, offset, desc.offset || function() { return this[prev_offset] + this[prev_size] })
  propertyExpression(object, size, desc.size)

  var domain = desc.domain || (desc.size === 1/8 ? { 0: false, 1 : true } : {})
    , reverse_domain = {}
  for (var n in domain) reverse_domain[domain[n]] = Number(n)

  Object.defineProperty(object, name, {
    get: function() {
      var len = this[size] * 8
      if (!len || len > 32) return new View(this, this[offset])

      var value = this['getUint' + len](this[offset])
      return (value in domain) ? domain[value] : value
    },

    set: function(value) {
      var len = this[size] * 8
      if (len > 32) return

      if (value in reverse_domain) value = reverse_domain[value]
      this['setUint' + len](this[offset], value)
    },

    enumerable: true
  })

  object.__last = name
}

function defineTypedProperty(object, name, desc) {
  if (typeof desc === 'function') desc = { view: desc }

  var offset = '__offset_' + name, size = '__size_' + name, type = '__type_' + name
    , prev_offset = '__offset_' + object.__last, prev_size = '__size_' + object.__last

  var buildtime_offset = propertyExpression(object, offset, desc.offset || function() { return this[prev_offset] + this[prev_size] })
  var buildtime_view   = propertyExpression(object, type, desc.view)

  Object.defineProperty(object, name, {
    get: function() {
      var nested_object = new this[type](this, this[offset])

      // The offset is constant, so the nested object can be cached safely
      if (buildtime_offset !== null) Object.defineProperty(this, name, { value: nested_object })

      return nested_object
    },

    set: function(value) {
      var nested_object = this[name]
      if (nested_object.set) nested_object.set(value)
    }
  })

  try {
    var prototype_size = Object.create(buildtime_view.prototype).size
  } catch (e) {
    // There's no buildtime information about the type, or it has no buildtime length property
  }
  propertyExpression(object, size, desc.size || prototype_size || function() { return this[name].size })

  object.__last = name
}

function defineParallelProperties(object, name, properties) {
  var previous = object.__last

  for (var i = 0; i < properties.length; i++) {
    object.__last = previous
    Template.defineProperties(object, properties[i])
  }
}

function defineArrayProperty(object, name, desc) {
  var item_desc, previous = object.__last

  if (typeof desc[0] === 'object') {
    Object.defineProperty(object, '__while_' + name, { value:
      desc[1] instanceof Function
      ? desc[1]
      : new Function('with(this) { return ' + desc[1] + '}')
    })
    item_desc = desc[0]

  } else if (typeof desc[1] === 'object') {
    propertyExpression(object, '__items_' + name, desc[0])
    item_desc = desc[1]

  } else {
    throw new Error('You have to specify an array length or a while expression.')
  }

  propertyExpression(object, '__offset_' + name, function() {
    return this['__offset_' + previous] + this['__size_' + previous]
  })
  Object.defineProperty(object, '__size_' + name, { get: function() {
    return this[name].size
  }})

  Object.defineProperty(object, name, { get: function() {
    var items = this['__items_' + name]
      , condition = this['__while_' + name] || function() { return this.length === items }
      , array = []

    array.__proto__ = new View(this, this['__offset_' + name])
    Object.defineProperties(array.__proto__, {
      __size_undefined: { value: 0 },
      __offset_undefined: { value: 0 },
      last: { get: function() { return this[this.__last] } },
      size: { get: function() { return this['__offset_' + this.__last] + this['__size_' + this.__last] } }
    })

    if (items !== 0) do {
      array.length += 1
      Template.defineProperty(array, array.length - 1, item_desc)
    } while (!condition.call(array))

    return array
  }})

  object.__last = name
}

function defineNestedProperties(object, name, desc) {
  if (!desc.__view) {
    var prototype = Template.create(Template.prototype, desc)
    desc.__view = function NestedStructure(parent, offset) { Template.call(this, parent, offset) }
    desc.__view.prototype = prototype
  }

  defineTypedProperty(object, name, { view: desc.__view })
}

module.exports = Template
