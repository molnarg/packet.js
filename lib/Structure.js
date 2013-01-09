var fields = require('./fields')
  , View = require('./View')

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
      descriptor = { value: descriptor.get.call(object) }
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

function Structure(parent, offset, desc) {
  View.call(this, parent, offset)

  var last = Structure.defineProperties(this, desc)

  // length
  propertyExpression(this, 'length', function() { return (this['__offset_' + last] + this['__length_' + last]) / 8 })
}

Structure.prototype = Object.create(View.prototype, {
  __length_undefined: { value: 0 },
  __offset_undefined: { value: 0 }
})

function structurePropertyInitializer(desc, name) {
  var offset = this['__offset_' + name], length = this['__length_' + name], type = this['__type_' + name]

  if (length <= 32 && !type) {
    // Small field without explicit type
    if (length === 1) {
      return fields.flag(Math.floor(offset / 8), offset % 8)

    } else {
      var property = fields.field(Math.floor(offset / 8), offset % 8, length, desc.signed, desc.littleEndian)
      if (desc.domain) property = enumProperty(property, desc.domain)
      return property
    }

  } else {
    // Big field, or a small field with explicit type
    return {
      value: new (type || View)(this.parent && this, offset / 8),
      configurable: true
    }
  }
}

Structure.defineBitfieldProperty = function(object, name, desc, previous) {
  if (!(desc instanceof Object)) desc = { length: desc }

  var offset = '__offset_' + name, length = '__length_' + name, type = '__type_' + name
    , previous_offset = '__offset_' + previous, previous_length = '__length_' + previous

  propertyExpression(object, offset, desc.offset || function() { return this[previous_offset] + this[previous_length] })
  propertyExpression(object, length, desc.length)
  propertyExpression(object, type, desc.type)

  var init = function() {
    return structurePropertyInitializer.call(this, desc, name)
  }

  try {
    Object.defineProperty(object, name, init.call(object))
  } catch(e) {
    if (!(e instanceof ReferenceError)) throw e
    Object.defineProperty(object, name, lazyProperty(name, init))
  }
}

Structure.defineProperty = function(object, name, desc, previous) {
  var prototype

  if (desc instanceof Array && desc.length === 1) {
    // Simple bitfield property
    Structure.defineBitfieldProperty(object, name, desc[0], previous)

  } else if (desc instanceof Array && desc.length > 1) {
    // Parallel structures
    var last
    for (var i = 0; i < desc.length; i++) {
      last = Structure.defineProperties(object, desc[i], previous)
    }
    propertyExpression(object, '__offset_' + name, function() { return this['__offset_' + previous] + this['__length_' + previous] })
    propertyExpression(object, '__length_' + name, function() { return this['__offset_' + last] + this['__length_' + last] - this['__offset_' + name] })

  } else {
    // Nested structure
    propertyExpression(object, '__offset_' + name, function() { return this['__offset_' + previous] + this['__length_' + previous] })
    prototype = new Structure(undefined, undefined, desc)
    Object.defineProperty(object, name, lazyProperty(name, function() {
      return { value: Object.create(prototype, {
        parent: { value: this },
        offset: { value: this['__offset_' + name] / 8 }
      })}
    }))
    propertyExpression(object, '__length_' + name, function() { return prototype.length * 8 || (this.root && this[name].length * 8) })
  }
}

Structure.defineProperties = function(object, properties, previous) {
  var names = properties._order || Object.keys(properties)

  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    Structure.defineProperty(object, name, properties[name], previous)
    previous = name
  }

  return previous
}

module.exports = Structure
