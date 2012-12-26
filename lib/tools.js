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

module.exports = tools
