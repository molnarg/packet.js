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
function propertyExpression(expression) {
  if (typeof expression === 'number') return { value: expression }
  if (typeof expression === 'string') return { get: Function('with(this) { return ' + expression + '}') }
  if (expression instanceof Function) return { get: expression }

  throw new Error('Property expression must be number, string or function.')
}

// Generating caching property. The getter is called only once, and then the result is cached.
// If there is not setter, then after the first call the property is overwritten with a simple value property.
function cachedProperty(name, descriptor) {
  if ('value' in descriptor) return descriptor

  descriptor.enumerable   = (descriptor.enumerable   !== false)  // default is true
  descriptor.configurable = (descriptor.configurable !== false)  // default is true

  var init = descriptor.get
  if (descriptor.set) {
    // Caching version. It creates a non-enumerable cache field, and after the first call it uses the stored value.
    var cache_name = name + '__cache'

    descriptor.get = function cachingGet() {
      // Cache hit
      if (this[cache_name]) return this[cache_name]

      // Creating the cache and returning it
      Object.defineProperty(this, cache_name, { value: init.call(this) })
      return this[cache_name]
    }

  } else {
    // Self-overwriting version. When first called, it overwrites itself with a simple value property.
    // Only usable if there is no setter, since that would be lost when redefining the property.
    descriptor.get = function selfOverwritingGet() {
      // Creating the value property with attributes identical to the original, and returning it
      Object.defineProperty(this, name, {
        value: init.call(this),
        writable: false, // since there was no setter
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable
      })
      return this[name]
    }
  }

  return descriptor
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

function simplify(self, descriptor) {
  var value

  try {
    value = descriptor.value || descriptor.get.call(self)
  } catch(e) {
    value = undefined
  }

  return (typeof value === 'number' && !isNaN(value)) ? { value: value, configurable: descriptor.configurable } : descriptor
}

function nestedStructure(structures, name, prototype, previous) {
  var child = prototype[name] = Object.create(prototype)
    , child_properties = tools.structure(structures, name, child, previous)
    , properties = { }

  properties[name] = {
    get: function() {
      // A clone view augmented with child properties
      var child = tools.view(this.buffer, this.byteOffset, this.byteLength)
      Object.defineProperties(child, child_properties)
      return child
    }
  }

  // Giving a reference to the property descriptor so that the caller of this fn. can modify it if needed
  properties[name].properties = child_properties

  /*
  if (properties.bitLength.value <= 32) {
    // This is a small size structure. It is good to have an easy way to acces the value of the whole bitfield
    // e.g. 'packet.flags = 7' sets the last three flags to 1
    var field = tools.field(Math.ceil(offset / 8), offset % 8, properties.bitLength.value)
      , field_name = name + '__field'

    // valueOf() ensures that the children object can be converted to number
    child_properties[field_name] = field
    child_properties.valueOf = { value: function() { return this[field_name] } }

    // Assigning a numerical value passes the value to the field property
    properties[field_name] = field
    properties[name].set = function(value) { this[field_name] = value }
  }
  */

  properties[name] = cachedProperty(name, properties[name])

  properties[name + '__offset'] = simplify(prototype, { get: function() { return this[name][name + '__offset'] } })
  properties[name + '__length'] = simplify(prototype, { get: function() { return this[name][name + '__length'] } })
  Object.defineProperty(prototype, name + '__offset', properties[name + '__offset'])
  Object.defineProperty(prototype, name + '__length', properties[name + '__length'])

  return properties
}

function structureProperty(desc, name, prototype, previous) {
  if (!(desc instanceof Object)) desc = { length: desc }
  var properties = {}, offset, offset_name = name + '__offset', length, length_name = name + '__length'

  // Offset depends on the previous property or it is given explicitly
  properties[offset_name] = /*cachedProperty(offset_name, */simplify(prototype,
    desc.offset ? propertyExpression(desc.offset)
                : { get: function() { return this[previous + '__offset'] + this[previous + '__length'] } }
  )//)
  Object.defineProperty(prototype, offset_name, properties[offset_name])

  // Length
  properties[length_name] = /*cachedProperty(length_name, */simplify(prototype,
    desc.length ? propertyExpression(desc.length)
                : { get: function() { return this.byteLength * 8 - this[name + '__offset'] } }
  )//)
  Object.defineProperty(prototype, length_name, properties[length_name])

  function init() {
    var length = this[name + '__length']
      , offset = this[name + '__offset']
      , byteOffset = Math.floor(offset / 8)
      , bitOffset = offset % 8

    if (length % 8 !== 0 && length > 32) throw new Error('Bitfield size longer than 32 bit.')
    if (length % 8 !== 0 && desc.tpye) throw new Error('A typed field must begin without bit offset.')

    if (desc.type) {
      return cachedProperty(name, {
        get: function() { return desc.type(this.buffer, this.byteOffset + byteOffset, length / 8) },
        configurable: true
      })

    } else if (length >= 32) {
      return cachedProperty(name, {
        get: function() { return tools.view(this.buffer, this.byteOffset + byteOffset, length / 8) },
        configurable: true
      })

    } else if (length < 32) {
      return (desc.length === 1) ? tools.flag(byteOffset, bitOffset)
                                 : tools.field(byteOffset, bitOffset, length, desc.signed, desc.littleEndian)
    }
  }

  if (  typeof properties[offset_name].value === 'number' && !isNaN(properties[offset_name].value)
     && typeof properties[length_name].value === 'number' && !isNaN(properties[length_name].value)) {
    properties[name] = init.call(prototype)
    Object.defineProperty(prototype, name, properties[name])

  } else {
    properties[name] = lazyProperty(name, init)

  }

  return properties
}

function extend(a, b) {
  for (var k in b) if (b.hasOwnProperty(k)) a[k] = b[k]
}

tools.structure = function(structure, name, prototype, previous) {
  var properties = {}
    , keys = structure._order || Object.keys(structure)

  prototype = prototype || { undefined__offset: 0, undefined__length: 0 }

  keys.forEach(function(name, index) {
    var desc = structure[name]

    if (desc instanceof Array && desc.length === 1) {
      // Nested structure
      extend(properties, nestedStructure(desc[0], name, prototype, previous))

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
      get: function() { return this[keys[0] + '__offset'] },
      configurable: true
    })
    properties[name + '__length'] = simplify(prototype, {
      get: function() { return (this[previous + '__offset'] + this[previous + '__length']) - this[keys[0] + '__offset'] },
      configurable: true
    })
    Object.defineProperty(prototype, name + '__offset', properties[name + '__offset'])
    Object.defineProperty(prototype, name + '__length', properties[name + '__length'])
  }

  return properties
}

module.exports = tools
