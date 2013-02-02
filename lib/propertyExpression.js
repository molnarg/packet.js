function defineStableProperty(object, name, descriptor) {
  if ('value' in descriptor) {
    Object.defineProperty(object, name, {
      value: descriptor.value,
      writable: false,
      configurable: true
    })

  } else {
    var cached = '__cached_' + name
    Object.defineProperty(object, name, {
      get: function() {
        if (this.unstable) {
          return descriptor.get.call(this)

        } else {
          if (!(cached in this)) this[cached] = descriptor.get.call(this)
          return this[cached]
        }
      },
      set: function() {
        throw new Error('Cannot change size and offset of properties in a stable packet.')
      },
      configurable: true
    })
  }
}

// Return null if runtime property, and the constant value otherwise
function propertyExpression(object, name, expression) {
  if (!expression) return undefined

  var descriptor
  if (typeof expression === 'string') {
    // anonymous function-like string
    descriptor = { get: new Function('with(this) { return ' + expression + '}') }

    // if it is a reference to a property, then it is possible to generate a setter as well
    if (expression.match(/^[0-9a-zA-Z_$.]*$/)) {
      descriptor.set = new Function('value', 'with(this) { ' + expression + ' = value }')
    }

  } else if (typeof expression === 'number' || typeof expression === 'boolean') {
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

  if (name.indexOf('__') === 0) {
    defineStableProperty(object, name, descriptor)
  } else {
    Object.defineProperty(object, name, descriptor)
  }


  return ('value' in descriptor) ? descriptor.value : null
}

module.exports = propertyExpression
