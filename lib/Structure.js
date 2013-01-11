var View = require('./View')

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

  propertyExpression(this, 'length', function() { return (this['__offset_' + last] + this['__length_' + last]) / 8 })
}

Structure.prototype = Object.create(View.prototype, {
  __length_undefined: { value: 0 },
  __offset_undefined: { value: 0 }
})

function bitfieldPropertyInitializer(desc, name) {
  var property, offset = this['__offset_' + name] / 8, length = this['__length_' + name], type = this['__type_' + name]

  if (length <= 32 && !type) {
    // Small field without explicit type
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
    // Big field, or a small field with explicit type
    property = {
      value: new (type || View)(this.parent && this, offset),
      configurable: true
    }
  }

  return property
}

Structure.defineBitfieldProperty = function(object, name, desc, previous) {
  if (!(desc instanceof Object)) desc = { length: desc }

  var offset = '__offset_' + name, length = '__length_' + name, type = '__type_' + name
    , previous_offset = '__offset_' + previous, previous_length = '__length_' + previous

  propertyExpression(object, offset, desc.offset || function() { return this[previous_offset] + this[previous_length] })
  propertyExpression(object, length, desc.length)
  propertyExpression(object, type, desc.type)

  var init = function() {
    return bitfieldPropertyInitializer.call(this, desc, name)
  }

  try {
    Object.defineProperty(object, name, init.call(object))
  } catch(e) {
    if (!(e instanceof ReferenceError)) throw e
    Object.defineProperty(object, name, lazyProperty(name, init))
  }

  return name
}

Structure.defineParallelProperties = function(object, name, properties, previous) {
  var last

  for (var i = 0; i < properties.length; i++) {
    last = Structure.defineProperties(object, properties[i], previous)
  }
  propertyExpression(object, '__offset_' + name, function() { return this['__offset_' + previous] + this['__length_' + previous] })
  propertyExpression(object, '__length_' + name, function() { return this['__offset_' + last] + this['__length_' + last] - this['__offset_' + name] })

  return name
}

Structure.defineArrayProperty = function(object, name, desc, previous) {
  var bracket = name.indexOf('[')
    , items = name.slice(bracket + 1, name.length - 1)
  name = name.slice(0, bracket)

  propertyExpression(object, '__offset_' + name, function() {
    return this['__offset_' + previous] + this['__length_' + previous]
  })
  propertyExpression(object, '__items_' + name, items)
  Object.defineProperty(object, '__length_' + name, { get: function() {
    var array = this[name], last = array.length - 1
    return array['__offset_' + last] + array['__length_' + last]
  }})
  Object.defineProperty(object, '__while_' + name, { value: new Function('with(this) { return ' + desc.while + '}')})
  delete desc.while

  var prototype = new Structure(undefined, undefined, desc)

  function defineItemProperty(array, i) {
    if (i === 0) {
      Object.defineProperty(array, '__offset_0', { value: 0 })

    } else {
      Object.defineProperty(array, '__offset_' + i, { get: function() {
        return this['__offset_' + (i - 1)] + this['__length_' + (i - 1)]
      }})
    }

    Object.defineProperty(array, '__length_' + i, { get: function() {
      return this[i].length * 8
    }})

    Object.defineProperty(array, i, { get: function() {
      return Object.create(prototype, {
        parent: { value: this },
        offset: { value: this['__offset_' + i] / 8 }
      })
    }})
  }

  Object.defineProperty(object, name, { get: function() {
    var items = this['__items_' + name]
      , condition = this['__while_' + name]
      , array = []

    array.__proto__ = new View(this, this['__offset_' + name] / 8)

    for (var i = 0; items ? (i < items) : (i === 0 || condition.call(array[i - 1])); i++) {
      array.length += 1
      defineItemProperty(array, i)
    }

    return array
  }})

  return name
}

Structure.defineNestedProperties = function(object, name, desc, previous) {
  propertyExpression(object, '__offset_' + name, function() { return this['__offset_' + previous] + this['__length_' + previous] })
  var prototype = new Structure(undefined, undefined, desc)
  Object.defineProperty(object, name, lazyProperty(name, function() {
    return { value: Object.create(prototype, {
      parent: { value: this },
      offset: { value: this['__offset_' + name] / 8 }
    })}
  }))
  propertyExpression(object, '__length_' + name, function() { return prototype.length * 8 || (this.root && this[name].length * 8) })

  return name
}

Structure.defineProperty = function(object, name, desc, previous) {
  var last

  if (name.indexOf('[') !== -1) {
    last = Structure.defineArrayProperty(object, name, desc, previous)

  } else if (desc instanceof Array && desc.length === 1) {
    last = Structure.defineBitfieldProperty(object, name, desc[0], previous)

  } else if (desc instanceof Array && desc.length > 1) {
    last = Structure.defineParallelProperties(object, name, desc, previous)

  } else {
    last = Structure.defineNestedProperties(object, name, desc, previous)
  }

  return last
}

Structure.defineProperties = function(object, properties, previous) {
  var names = properties._order || Object.keys(properties)

  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    previous = Structure.defineProperty(object, name, properties[name], previous)
  }

  return previous
}

module.exports = Structure
