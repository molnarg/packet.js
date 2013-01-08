var fields = require('./fields')
  , View = require('./View')

// Intuitive way of describing a property
function propertyExpression(type, expression) {
  if (typeof expression === 'string') return { get: new Function('with(this) { return ' + expression + '}') }

  if (type === 'number') {
    if (typeof expression === 'number') return { value: expression }
    if (expression instanceof Function) return { get: expression }

    throw new Error('Number type property expression must be number, string or function.')

  } else if (type === 'constructor') {
    if (expression instanceof Function) {
      var properties = Object.getOwnPropertyNames(expression.prototype)
      if (properties.length === 1 && properties[0] === 'constructor') {
        // expression is an anonymous function that returns the class
        return { get: expression }

      } else {
        // expression is a constructor function
        return { value: expression }
      }
    }

    throw new Error('Type property expression must be string or function.')

  } else {
    throw new Error('Could not parse property expression.')
  }

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

var runtime_property = {
  get: function() { throw new ReferenceError() },
  set: function() { throw new ReferenceError() }
}

function simplify(self, descriptor) {
  try {
    return {
      value: descriptor.value || descriptor.get.call(self),
      configurable: descriptor.configurable !== false,
      enumerable: descriptor.enumerable
    }
  } catch(e) {
    if (!(e instanceof ReferenceError)) throw e
    return descriptor
  }
}

function nestedStructure(structures, name, prototype, previous) {
  var properties = {}
  properties[name + '__offset'] = simplify(prototype, { get: function() { return this[previous + '__offset'] + this[previous + '__length'] } })
  Object.defineProperty(prototype, name + '__offset', properties[name + '__offset'])

  var child = prototype[name] = Object.create(View.prototype, {
        undefined__offset: { value: 0, enumerable: true },
        undefined__length: { value: 0 },
        parent: { value: prototype },
        offset: { get: function() { return prototype[name + '__offset'] / 8 } }
      })
    , child_properties = structure(structures, name, child, undefined)
    , child_prototype = Object.create(View.prototype, child_properties)

  properties[name] = lazyProperty(name, function() {
    return { value: Object.create(child_prototype, {
      parent: { value: this },
      offset: { value: this[name + '__offset'] / 8 }
    }) }
  })

  properties[name + '__length'] = simplify(prototype, { get: function() { return this[name][name + '__length'] } })
  Object.defineProperty(prototype, name + '__length', properties[name + '__length'])

  return properties
}

function structurePropertyInitializer(desc, name) {
  var offset = this[name + '__offset'], length = this[name + '__length'], type = this[name + '__type']

  if (length <= 32 && !type) {
    // Small field without explicit type
    if (desc.length === 1) {
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

function structureProperty(desc, name, prototype, previous) {
  if (!(desc instanceof Object)) desc = { length: desc }
  var properties = {}, offset_name = name + '__offset', length_name = name + '__length', type_name = name + '__type'

  // Offset, length and type are either dynamic or static. Dynamic is denoted to init() by null value in the prototype.

  // Offset. If no explicit offset is given, it is the position where the previous field ends
  properties[offset_name] = simplify(prototype,
    desc.offset ? propertyExpression('number', desc.offset)
                : { get: function() { return this[previous + '__offset'] + this[previous + '__length'] } }
  )
  Object.defineProperty(prototype, offset_name, properties[offset_name])

  // Length. If no explicit length is given, all the remaining bytes are used.
  properties[length_name] = simplify(prototype,
    desc.length ? propertyExpression('number', desc.length)
                : { get: function() { return undefined } }
  )
  Object.defineProperty(prototype, length_name, properties[length_name])

  // Type. If it is not explicitly given, the type is decided at initialization time based on the size.
  if (desc.type) {
    properties[type_name] = simplify(prototype, propertyExpression('constructor', desc.type))
    Object.defineProperty(prototype, type_name, properties[type_name])
  }

  var init = function() {
    return structurePropertyInitializer.call(this, desc, name)
  }

  try {
    properties[name] = init.call(prototype)
  } catch(e) {
    if (!(e instanceof ReferenceError)) throw e
    properties[name] = lazyProperty(name, init)
  }
  Object.defineProperty(prototype, name, runtime_property)

  return properties
}

function extend(a, b) {
  for (var k in b) if (b.hasOwnProperty(k)) a[k] = b[k]
}

function structure(structures, name, prototype, previous) {
  var properties = {}
    , keys = structures._order || Object.keys(structures)

  prototype = prototype || Object.create(null, {
    undefined__offset: { value: 0, enumerable: true },
    undefined__length: { value: 0 },
    parent: runtime_property,
    offset: runtime_property,
    buffer: runtime_property,
    byteLength: runtime_property,
    byteOffset: runtime_property
  })

  keys.forEach(function(name) {
    var desc = structures[name]

    if (desc instanceof Array && desc.length === 1) {
      // Simple structure property
      extend(properties, structureProperty(desc[0], name, prototype, previous))

    } else if (desc instanceof Array && desc.length > 1) {
      // Parallel structures
      for (var i = 0; i < desc.length; i++) {
        extend(properties, structure(desc[i], name, prototype, previous))
      }

    } else {
      // Nested structure
      extend(properties, nestedStructure(desc, name, prototype, previous))
    }

    previous = name
  })

  if (name) {
    properties[name + '__offset'] = simplify(prototype, {
      get: function() { return this[keys[0] + '__offset'] }
    })
    properties[name + '__length'] = simplify(prototype, {
      get: function() { return (this[previous + '__offset'] + this[previous + '__length']) - this[keys[0] + '__offset'] }
    })
    if ('value' in properties[name + '__offset']) prototype[name + '__offset'] = properties[name + '__offset'].value
    if ('value' in properties[name + '__length']) prototype[name + '__length'] = properties[name + '__length'].value
  }

  return properties
}

module.exports = structure
