var View = require('./View')
  , read  = Function.prototype.call.bind(View.prototype.get(false, 8))
  , write = Function.prototype.call.bind(View.prototype.set(false, 8))

var fields = module.exports = { node: typeof Buffer !== 'undefined' }

// Copy the given bits from the source to the target
fields.copy = function(source, sourceBitOffset, bitLength, target, targetBitOffset) {
  var sourceByteOffset = Math.floor(sourceBitOffset / 8)
    , sourceBeginPadding = sourceBitOffset % 8
    , sourceByteLength = Math.ceil((sourceBeginPadding + bitLength) / 8)
    , sourceEndPadding = sourceByteLength * 8 - bitLength - sourceBeginPadding

    , targetByteOffset = Math.floor(targetBitOffset / 8)
    , targetBeginPadding = targetBitOffset % 8
    , targetByteLength = Math.ceil((targetBeginPadding + bitLength) / 8)
    , targetEndPadding = targetByteLength * 8 - bitLength - targetBeginPadding

  // Other bytes
  var bytes = new Array(sourceByteLength)
  for (var j = 0; j < sourceByteLength; j++) bytes[j] = read(source, sourceByteOffset + j)
  if (targetByteLength > sourceByteLength || targetBeginPadding > sourceBeginPadding) bytes.unshift(0)

  var leftShift = (sourceBeginPadding - targetBeginPadding + 8) % 8
  for (var k = 0; k < bytes.length; k++) {
    bytes[k] = ((bytes[k] << leftShift) & 255) | ((bytes[k + 1] || 0) >> 8 - leftShift)
  }

  var beginMask = 255 >> targetBeginPadding
    , endMask = 255 << targetEndPadding
  bytes[0] &= beginMask
  bytes[0] |= ~beginMask & read(target, targetByteOffset)
  bytes[targetByteLength - 1] &= endMask
  bytes[targetByteLength - 1] |= ~endMask & read(target, targetByteOffset + targetByteLength - 1)

  for (var l = 0; l < targetByteLength; l++) write(target, targetByteOffset + l, bytes[l])
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

    var bufferOffset = byteOffset * 8 + bitOffset
      , tempOffset = chunkBitLength - bitLength

    return {
      get: function() {
        fields.clear(tempView)
        fields.copy(this, bufferOffset, bitLength, tempView, tempOffset)
        return chunkReadFn.call(tempView, 0)
      },
      set: function(value) {
        chunkWriteFn.call(tempView, 0, value)
        fields.copy(tempView, tempOffset, bitLength, this, bufferOffset)
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
