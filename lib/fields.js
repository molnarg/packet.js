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

    , source_read =  (source instanceof DataView) ? source.getUint8.bind(source)
                                                  : source.readUInt8.bind(source)
    , target_read =  (target instanceof DataView) ? target.getUint8.bind(target)
                                                  : target.readUInt8.bind(target)
    , target_write = (target instanceof DataView) ? target.setUint8.bind(target)
                                                  : function(offset, value) { target.writeUInt8(value, offset) }

  // Other bytes
  var bytes = new Array(sourceByteLength)
  for (var j = 0; j < sourceByteLength; j++) bytes[j] = source_read(sourceByteOffset + j)
  if (targetByteLength > sourceByteLength || targetBeginPadding > sourceBeginPadding) bytes.unshift(0)

  var leftShift = (sourceBeginPadding - targetBeginPadding + 8) % 8
  for (var k = 0; k < bytes.length; k++) {
    bytes[k] = ((bytes[k] << leftShift) & 255) | ((bytes[k + 1] || 0) >> 8 - leftShift)
  }

  var beginMask = 255 >> targetBeginPadding
    , endMask = 255 << targetEndPadding
  bytes[0] &= beginMask
  bytes[0] |= ~beginMask & target_read(targetByteOffset)
  bytes[targetByteLength - 1] &= endMask
  bytes[targetByteLength - 1] |= ~endMask & target_read(targetByteOffset + targetByteLength - 1)

  for (var l = 0; l < targetByteLength; l++) target_write(targetByteOffset + l, bytes[l])
}

fields.field = function(byteOffset, bitOffset, bitLength, signed, littleEndian) {
  return {
    get: function() { return this.getUint(bitLength, byteOffset * 8 + bitOffset, littleEndian) },
    set: function(value) { this.setUint(bitLength, byteOffset * 8 + bitOffset, value, littleEndian) },
    enumerable: true
  }
}

fields.flag = function(byteOffset, bitOffset) {
  var mask = 1 << (7 - bitOffset)

  return {
    get: function() {
      return 0 < (this.getUint8(byteOffset) & mask)
    },
    set: function(value) {
      if (value) {
        this.setUint8(byteOffset, this.getUint8(byteOffset) | mask)
      } else {
        this.setUint8(byteOffset, this.getUint8(byteOffset) & ~mask)
      }
    },
    configurable: true,
    enumerable: true
  }
}
