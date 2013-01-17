var View = require('./View')
  , protocols = require('./tables/protocols')
  , views = require('./views')

function Structure(parent, offset) {
  View.call(this, parent, offset)
}

Structure.prototype = Object.create(View.prototype, {
  __length_undefined: { value: 0 },
  __offset_undefined: { value: 0 },
  payload: { get: function() {
    var ViewClass = views[protocols[this.payload_protocol]]

    return ViewClass && new ViewClass(this, this.payload_view.offset)
  }},

  length: { get: function() {
    return (this['__offset_' + this.__last] + this['__length_' + this.__last]) / 8
  }}
})

Structure.defineProperty = function(object, name, desc) {
  if (desc instanceof Array) {
    if (desc.every(function(item) { return typeof item === 'object' })) {
      defineParallelProperties(object, name, desc)

    } else {
      defineArrayProperty(object, name, desc)
    }

  } else if (typeof desc === 'function' || (typeof desc === 'object' && desc.constructor.prototype instanceof View)) {
    defineTypedProperty(object, name, desc)

  } else if (typeof desc === 'number' || 'length' in desc || 'offset' in desc) {
    defineBitfieldProperty(object, name, desc)

  } else if ('value' in desc || 'get' in desc || 'set' in desc) {
    Object.defineProperty(object, name, desc)

  } else {
    defineNestedProperties(object, name, desc)
  }
}

Structure.defineProperties = function(object, properties) {
  var names = properties._order || Object.keys(properties)

  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    Structure.defineProperty(object, name, properties[name])
  }
}

Structure.create = function(prototype, descriptor) {
  var structure = Object.create(prototype)

  Structure.defineProperties(structure, descriptor)

  return structure
}

function propertyExpression(object, name, expression) {
  if (!expression) return

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

  Object.defineProperty(object, name, descriptor)
}

function lazyProperty(name, init) {
  return {
    get: function() {
      Object.defineProperty(this, name, init.call(this))
      return this[name]
    },
    set: function(value) {
      Object.defineProperty(this, name, init.call(this))
      this[name] = value
    },
    configurable: true, // To be able to redefine the temporary property
    enumerable: true
  }
}

function enumProperty(descriptor, domain) {
  var reverse_domain = {}
  for (var n in domain) if (domain.hasOwnProperty(n)) reverse_domain[domain[n]] = Number(n)

  return {
    get: function() {
      var value = descriptor.get.call(this)
      return domain[value] !== undefined ? domain[value] : value
    },
    set: function(value) {
      if (reverse_domain[value] !== undefined) value = reverse_domain[value]
      descriptor.set.call(this, value)
    }
  }
}

function bitfieldPropertyInitializer(desc, name) {
  var property, offset = this['__offset_' + name] / 8, length = this['__length_' + name]

  if (length <= 32) {
    var getter = 'getUint' + length
      , setter = 'setUint' + length

    property = {
      get: function() { return this[getter](offset) },
      set: function(value) { this[setter](offset, value) },
      enumerable: true
    }

    if (desc.domain) {
      property = enumProperty(property, desc.domain)
    } else if (length === 1) {
      property = enumProperty(property, { 0: false, 1 : true })
    }

  } else {
    property = {
      value: new View(this.parent && this, offset),
      configurable: true
    }
  }

  return property
}

function defineBitfieldProperty(object, name, desc) {
  if (!(desc instanceof Object)) desc = { length: desc }

  var offset = '__offset_' + name, length = '__length_' + name
    , previous_offset = '__offset_' + object.__last, previous_length = '__length_' + object.__last

  propertyExpression(object, offset, desc.offset || function() { return this[previous_offset] + this[previous_length] })
  propertyExpression(object, length, desc.length)

  var init = function() {
    return bitfieldPropertyInitializer.call(this, desc, name)
  }

  try {
    Object.defineProperty(object, name, init.call(object))
  } catch(e) {
    if (!(e instanceof ReferenceError)) throw e
    Object.defineProperty(object, name, lazyProperty(name, init))
  }

  object.__last = name
}

function defineTypedProperty(object, name, desc) {
  if (typeof desc === 'function') desc = { constructor: desc }

  var offset = '__offset_' + name, length = '__length_' + name, type = '__type_' + name
    , previous_offset = '__offset_' + object.__last, previous_length = '__length_' + object.__last

  propertyExpression(object, offset, desc.offset || function() { return this[previous_offset] + this[previous_length] })
  propertyExpression(object, type, desc.constructor)

  Object.defineProperty(object, name, { get: function() {
    var Type = this[type]
    return new Type(this, this[offset] / 8)
  }})

  propertyExpression(object, length, desc.length || function() { return this[name].length * 8 })
  // TODO: cannot determine length if it is static, but the offset is not, because no new instance can be created

  object.__last = name
}

function defineParallelProperties(object, name, properties) {
  var previous = object.__last

  for (var i = 0; i < properties.length; i++) {
    object.__last = previous
    Structure.defineProperties(object, properties[i])
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
    return this['__offset_' + previous] + this['__length_' + previous]
  })
  Object.defineProperty(object, '__length_' + name, { get: function() {
    return this[name].size
  }})

  Object.defineProperty(object, name, { get: function() {
    var items = this['__items_' + name]
      , condition = this['__while_' + name] || function() { return this.length === items }
      , array = []

    array.__proto__ = new View(this, this['__offset_' + name] / 8)
    Object.defineProperties(array.__proto__, {
      __length_undefined: { value: 0 },
      __offset_undefined: { value: 0 },
      last: { get: function() { return this[this.__last] } },
      size: { get: function() { return this['__offset_' + this.__last] + this['__length_' + this.__last] } }
    })

    if (items !== 0) do {
      array.length += 1
      Structure.defineProperty(array, array.length - 1, item_desc)
    } while (!condition.call(array))

    return array
  }})

  object.__last = name
}

function defineNestedProperties(object, name, desc) {
  var previous = object.__last

  propertyExpression(object, '__offset_' + name, function() { return this['__offset_' + previous] + this['__length_' + previous] })

  if (!desc.__prototype) desc.__prototype = Structure.create(Structure.prototype, desc)
  Object.defineProperty(object, name, lazyProperty(name, function() {
    return { value: Object.create(desc.__prototype, {
      parent: { value: this },
      offset: { value: this['__offset_' + name] / 8 }
    })}
  }))

  propertyExpression(object, '__length_' + name, function() { return this[name].length * 8 })

  object.__last = name
}

module.exports = Structure
