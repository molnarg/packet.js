var fields = module.exports = { node: typeof Buffer !== 'undefined' }

fields.field = function(offset, bitLength, signed) {
  var getter = 'getUint' + bitLength
    , setter = 'setUint' + bitLength

  return {
    get: function() { return this[getter](offset) },
    set: function(value) { this[setter](offset, value) },
    enumerable: true
  }
}

fields.flag = function(offset) {
  var byteOffset = offset % 1
    , bitOffset = (offset - byteOffset) * 8
    , mask = 1 << (7 - bitOffset)

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
