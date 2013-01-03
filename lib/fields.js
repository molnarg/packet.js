var View = require('./View')
  , read  = Function.prototype.call.bind(View.prototype.get(false, 8))
  , write = Function.prototype.call.bind(View.prototype.set(false, 8))

var fields = module.exports = { node: typeof Buffer !== 'undefined' }

// In-place shift
fields.shift = function(view, offset, begin, end) {
  begin = begin || 0
  end = end || view.length

  var i, current, neighbour, byteMask = 255
  if (offset < 0) {
    offset = -offset
    for (i = begin; i < end; i++) {
      current = read(view, i)
      neighbour = (i + 1 < end) ? read(view, i + 1) : 0
      write(view, i, ((current << offset) & byteMask) | (neighbour >> 8 - offset))
    }

  } else {
    for (i = end - 1; i >= begin; i--) {
      current = read(view, i)
      neighbour = (i - 1 >= begin) ? read(view, i - 1) : 0
      write(view, i, (current >> offset) | ((neighbour << 8 - offset) & byteMask))
    }
  }
}

// Copy the given bits from the source to the target
fields.copy = function(source, sourceBitOffset, bitLength, target, targetBitOffset) {
  var sourceByteOffset = Math.floor(sourceBitOffset / 8)
    , targetByteOffset = Math.floor(targetBitOffset / 8)
    , beginPadding = sourceBitOffset % 8
    , byteLength = Math.ceil((beginPadding + bitLength) / 8)
    , endPadding = byteLength * 8 - bitLength - beginPadding

  if (targetBitOffset % 8 !== beginPadding) throw new Error('Shifting while copying is not supported yet.')

  if (byteLength === 1) {
    var mask = (255 >> beginPadding) & (255 << endPadding)

    write(target, targetByteOffset, (read(source, sourceByteOffset) & mask)
                                  | (read(target, targetByteOffset) & ~mask)
    )

  } else {
    var beginMask = 255 >> beginPadding
      , endMask = 255 << endPadding

    // First byte
    write(target, targetByteOffset, (read(source, sourceByteOffset) & beginMask)
                                  | (read(target, targetByteOffset) & ~beginMask)
    )

    // Last byte
    write(target, targetByteOffset  + byteLength - 1, (read(source, sourceByteOffset + byteLength - 1) & endMask)
                                                    | (read(target, targetByteOffset + byteLength - 1) & ~endMask)
    )

    // Other bytes
    for (var i = 1; i < byteLength - 1; i++) {
      write(target, targetByteOffset + i, read(source, sourceByteOffset + i))
    }
  }
}

fields.clear = function(view) {
  for (var i = 0; i < view.byteLength; i++) view.writeUInt8(0, i)
}

// Helpers for non regular fields
var tempBuffer = fields.node ? (new Buffer(5)) : (new ArrayBuffer(5))
  , tempView = View.create(tempBuffer)

fields.field = function(byteOffset, bitOffset, bitLength, signed, littleEndian) {
  if (bitLength > 32) throw new Error('Too large field.')
  if (bitOffset > 7) throw new Error('Invalid bitOffset.')

  if (bitLength === 0) return { value: null }

  var chunkBitLength = Math.pow(2, Math.max(3, Math.ceil(Math.log(bitLength)/Math.log(2))))
    , chunkReadFn  = View.prototype.get(signed, chunkBitLength, littleEndian)
    , chunkWriteFn = View.prototype.set(signed, chunkBitLength, littleEndian)

  if (bitOffset === 0 && bitLength === chunkBitLength) {
    // There are build-in functions for this bit length and bitOffset is 0
    return {
      get: function() { return chunkReadFn.call(this, byteOffset) },
      set: function(value) { chunkWriteFn.call(this, byteOffset, value) },
      configurable: true,
      enumerable: true
    }

  } else {
    // There is no build-in function for this bit length or bitOffset isn't 0
    if (littleEndian) throw new Error('Only big endian irregular fields are supported.')
    if (signed) throw new Error('Only unsigned irregular fields are supported.')

    var chunkByteLength = chunkBitLength / 8
      , chunkFirstByte = 5 - chunkByteLength
      , chunkRead  = chunkReadFn .bind(tempView, chunkFirstByte)
      , chunkWrite = chunkWriteFn.bind(tempView, chunkFirstByte)

      , usefulBitLength = bitLength + bitOffset
      , usefulByteLength = Math.ceil(usefulBitLength / 8)
      , usefulFirstByte = 5 - usefulByteLength
      , shiftOffset = usefulByteLength * 8 - usefulBitLength

    return {
      get: function() {
        fields.clear(tempView)
        fields.copy(this, byteOffset * 8 + bitOffset, bitLength, tempView, usefulFirstByte * 8 + bitOffset)
        fields.shift(tempView, shiftOffset, usefulFirstByte)
        return chunkRead()
      },
      set: function(value) {
        chunkWrite(value)
        fields.shift(tempView, -shiftOffset, usefulFirstByte)
        fields.copy(tempView, usefulFirstByte * 8 + bitOffset, bitLength, this, byteOffset * 8 + bitOffset)
      },
      configurable: true,
      enumerable: true
    }
  }
}

fields.flag = function(byteOffset, bitOffset) {
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
