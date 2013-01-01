var tools = {}

if (typeof Buffer !== 'undefined') {
  // node.js
  tools.node = true

  tools.view = function(buffer, offset, length) {
    offset = offset || 0
    length = length || (buffer.length - offset)

    var view = buffer.slice(offset, offset + length)
    view.buffer = buffer
    view.byteOffset = offset
    view.byteLength = length

    return view
  }

  // read and write methods
  Object.keys(Buffer.prototype).filter(function(methodname) {
    return methodname.indexOf('read') === 0 || methodname.indexOf('write') === 0
  }).forEach(function(methodname) {
    tools[methodname] = Function.prototype.call.bind(Buffer.prototype[methodname])
  })

} else if (typeof DataView !== 'undefined') {
  // Browser
  tools.node = false

  tools.view = function(buffer, offset, length) {
  }

} else {
  throw new Error('No supported Buffer implementation found.')
}

// In-place shift
tools.shift = function(view, offset, begin, end) {
  begin = begin || 0
  end = end || view.length

  var i, current, neighbour, byteMask = 255
  if (offset < 0) {
    offset = -offset
    for (i = begin; i < end; i++) {
      current = view.readUInt8(i)
      neighbour = (i + 1 < end) ? view.readUInt8(i + 1) : 0
      view.writeUInt8(((current << offset) & byteMask) | (neighbour >> 8 - offset), i)
    }

  } else {
    for (i = end - 1; i >= begin; i--) {
      current = view.readUInt8(i)
      neighbour = (i - 1 >= begin) ? view.readUInt8(i - 1) : 0
      view.writeUInt8((current >> offset) | ((neighbour << 8 - offset) & byteMask), i)
    }
  }
}

// Copy the given bits from the source to the target
tools.copy = function(source, sourceBitOffset, bitLength, target, targetBitOffset) {
  var sourceByteOffset = Math.floor(sourceBitOffset / 8)
    , targetByteOffset = Math.floor(targetBitOffset / 8)
    , beginPadding = sourceBitOffset % 8
    , byteLength = Math.ceil((beginPadding + bitLength) / 8)
    , endPadding = byteLength * 8 - bitLength - beginPadding

  if (targetBitOffset % 8 !== beginPadding) throw new Error('Shifting while copying is not supported yet.')

  if (byteLength === 1) {
    var mask = (255 >> beginPadding) & (255 << endPadding)

    target.writeUInt8( (source.readUInt8(sourceByteOffset) & mask)
                     | (target.readUInt8(targetByteOffset) & ~mask)
                     , targetByteOffset
    )

  } else {
    var beginMask = 255 >> beginPadding
      , endMask = 255 << endPadding

    // First byte
    target.writeUInt8( (source.readUInt8(sourceByteOffset) & beginMask)
                     | (target.readUInt8(targetByteOffset) & ~beginMask)
                     , targetByteOffset
    )

    // Last byte
    target.writeUInt8( (source.readUInt8(sourceByteOffset + byteLength - 1) & endMask)
                     | (target.readUInt8(targetByteOffset + byteLength - 1) & ~endMask)
                     , targetByteOffset + byteLength - 1
    )

    // Other bytes
    for (var i = 1; i < byteLength - 1; i++) {
      target.writeUInt8(source.readUInt8(sourceByteOffset + i), targetByteOffset + i)
    }
  }
}

tools.clear = function(view) {
  for (var i = 0; i < view.byteLength; i++) view.writeUInt8(0, i)
}

// Helpers for non regular fields
var tempBuffer = tools.node ? (new Buffer(5)) : (new ArrayBuffer(5))
  , tempView = tools.view(tempBuffer)

tools.field = function(byteOffset, bitOffset, bitLength, signed, littleEndian) {
  if (bitLength > 32) throw new Error('Too large field.')
  if (bitOffset > 7) throw new Error('Invalid bitOffset.')

  if (bitLength === 0) return { value: null }

  var chunkBitLength = Math.pow(2, Math.max(3, Math.ceil(Math.log(bitLength)/Math.log(2))))
    , postfix = (signed ? '' : 'U') + 'Int' + chunkBitLength + (chunkBitLength == 8 ? '' : (littleEndian ? 'LE' : 'BE'))
    , chunkReadFn = tools['read' + postfix]
    , chunkWriteFn = tools['write' + postfix]

  if (bitOffset === 0 && bitLength === chunkBitLength) {
    // There are build-in functions for this bit length and bitOffset is 0
    return {
      get: function() { return chunkReadFn(this, byteOffset) },
      set: function(value) { chunkWriteFn(this, value, byteOffset) },
      configurable: true,
      enumerable: true
    }

  } else {
    // There is no build-in function for this bit length or bitOffset isn't 0
    if (littleEndian) throw new Error('Only big endian irregular fields are supported.')
    if (signed) throw new Error('Only unsigned irregular fields are supported.')

    var chunkByteLength = chunkBitLength / 8
      , chunkFirstByte = 5 - chunkByteLength
      , chunkRead = chunkReadFn.bind(null, tempView, chunkFirstByte)
      , chunkWrite = function(value) { chunkWriteFn(tempView, value, chunkFirstByte) }

      , usefulBitLength = bitLength + bitOffset
      , usefulByteLength = Math.ceil(usefulBitLength / 8)
      , usefulFirstByte = 5 - usefulByteLength
      , shiftOffset = usefulByteLength * 8 - usefulBitLength

    return {
      get: function() {
        tools.clear(tempView)
        tools.copy(this, byteOffset * 8 + bitOffset, bitLength, tempView, usefulFirstByte * 8 + bitOffset)
        tools.shift(tempView, shiftOffset, usefulFirstByte)
        return chunkRead()
      },
      set: function(value) {
        chunkWrite(value)
        tools.shift(tempView, -shiftOffset, usefulFirstByte)
        tools.copy(tempView, usefulFirstByte * 8 + bitOffset, bitLength, this, byteOffset * 8 + bitOffset)
      },
      configurable: true,
      enumerable: true
    }
  }
}

tools.flag = function(byteOffset, bitOffset) {
  var mask = 1 << (7 - bitOffset)

  return {
    get: function() {
      return 0 < (this[byteOffset] & mask)
    },
    set: function(value) {
      if (value) {
        this[byteOffset] |= mask
      } else {
        this[byteOffset] &= ~mask
      }
    },
    configurable: true,
    enumerable: true
  }
}

// Intuitive way of describing a property
function propertyExpression(type, expression) {
  if (typeof expression === 'string') return { get: Function('with(this) { return ' + expression + '}') }

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
    configurable: true // To be able to redefine the temporary property
  }
}

function enumProperty(descriptor, domain) {
  var reverse_domain = {}
  for (var n in domain) reverse_domain[domain[n]] = Number(n)

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

runtime_property = {
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

function structurePropertyInitializer(desc, name) {
  var offset = this[name + '__offset'], length = this[name + '__length'], type = this[name + '__type']

  if (length <= 32 && !type) {
    // Small field without explicit type
    if (desc.length === 1) {
      return tools.flag (Math.floor(offset / 8), offset % 8)
    } else {
      var property = tools.field(Math.floor(offset / 8), offset % 8, length, desc.signed, desc.littleEndian)
      if (desc.domain) property = enumProperty(property, desc.domain)
      return property
    }

  } else {
    // Big field, or a small field with explicit type
    if (length % 8 !== 0) throw new Error('Bitfield size longer than 32 bit.')

    return {
      value: (type || tools.view)(this.buffer, this.byteOffset + offset / 8, length / 8),
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
                : { get: function() { return this.byteLength * 8 - this[name + '__offset'] } }
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

tools.structure = function(structure, name, prototype, previous) {
  var properties = {}
    , keys = structure._order || Object.keys(structure)

  prototype = prototype || Object.create(null, {
    undefined__offset: { value: 0 },
    undefined__length: { value: 0 },
    buffer: runtime_property,
    byteLength: runtime_property,
    byteOffset: runtime_property
  })

  keys.forEach(function(name, index) {
    var desc = structure[name]

    if (desc instanceof Array && desc.length === 1) {
      // Nested structure
      throw new Error('Arrays not yet implemented')

    } else if (desc instanceof Array && desc.length > 1) {
      // Parallel structures
      for (var i = 0; i < desc.length; i++) {
        extend(properties, tools.structure(desc[i], name, prototype, previous))
      }

    } else {
      // Simple structure property
      extend(properties, structureProperty(desc, name, prototype, previous))
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

module.exports = tools
