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

  var chunkBitLength = Math.pow(2, Math.max(3, Math.ceil(Math.log(bitLength)/Math.log(2))))
    , postfix = (signed ? '' : 'U') + 'Int' + chunkBitLength + (chunkBitLength == 8 ? '' : (littleEndian ? 'LE' : 'BE'))
    , chunkReadFn = tools['read' + postfix]
    , chunkWriteFn = tools['write' + postfix]

  if (bitOffset === 0 && bitLength === chunkBitLength) {
    // There are build-in functions for this bit length and bitOffset is 0
    return {
      get: function() { return chunkReadFn(this, byteOffset) },
      set: function(value) { chunkWriteFn(this, value, byteOffset) },
      configurable: true
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
      configurable: true
    }
  }
}

tools.flag = function(byteOffset, bitOffset) {
  var mask = 1 << bitOffset

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
    }
  }
}

function nestedStructure(structures, offset, name) {
  var child_properties = tools.structure(structures, offset)
    , child_name = name + '__child'
    , properties = { bitLength: { value: child_properties.bitLength.value } }

  properties[name] = {
    get: function() {
      // Lazy initialization. Storing the initialized object in this[name + '__child']
      if (this[child_name]) return this[child_name]

      // A clone view augmented with child properties
      var child = tools.view(this.buffer, this.byteOffset, this.byteLength)
      Object.defineProperties(child, child_properties)
      Object.defineProperty(this, child_name, { value: child })

      return child
    },

    // Giving a reference to the property descriptor so that the caller of this fn. can modify it if needed
    properties: child_properties
  }

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

  return properties
}

function parallelStructure(structures, offset) {
  var properties = { bitLength: { value: undefined } }

  structures.forEach(function(subStructure) {
    var subProperties = tools.structure(subStructure, offset)

    if (!properties.bitLength.value) {
      properties.bitLength.value = subProperties.bitLength.value
    } else if (subProperties.bitLength.value !== properties.bitLength.value) {
      throw new Error('Parallel structures must have the same length.')
    }

    for (var key in subProperties) if (subProperties.hasOwnProperty(key)) properties[key] = subProperties[key]
  })

  return properties
}

tools.structure = function(structure, offsetStart) {
  var properties = {}
    , offset = offsetStart || 0
    , keys = structure._order || Object.keys(structure)

  keys.forEach(function(name) {
    // Descriptor
    var desc = structure[name]
    if (typeof desc === 'number') desc = { length: desc }

    var byteOffset = Math.ceil(offset / 8), bitOffset = offset % 8

    if (desc instanceof Array) {
      // Parallel or nested structure
      var props = (desc.length === 1) ? nestedStructure(desc[0], offset, name) : parallelStructure(desc, offset)
      for (var k in props) if (props.hasOwnProperty(k)) properties[k] = props[k]
      offset += props.bitLength.value

    } else if (desc.type) {
      // Typed field with lazy initialization
      var instance_name = name + '__instance'
      properties[name] = {
        get: function() {
          if (this[instance_name]) return this[instance_name]
          Object.defineProperty(this, instance_name, { value: desc.type(this.buffer, byteOffset, desc.length / 8) })
          return this[instance_name]
        }
      }
      offset += desc.length

    } else {
      // Simple bitfield
      properties[name] = (desc.length === 1) ? tools.flag(byteOffset, bitOffset)
                                             : tools.field(byteOffset, bitOffset, desc.length, desc.signed, desc.littleEndian)
      offset += desc.length
    }
  })

  properties.bitLength = { value: offset - (offsetStart || 0) }

  return properties
}

module.exports = tools
