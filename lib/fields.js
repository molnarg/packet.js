var fields = module.exports = { node: typeof Buffer !== 'undefined' }

fields.field = function(byteOffset, bitOffset, bitLength, signed) {
  var getter = 'getUint' + bitLength
    , setter = 'setUint' + bitLength
    , offset = byteOffset + bitOffset / 8

  return {
    get: function() { return this[getter](offset) },
    set: function(value) { this[setter](offset, value) },
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
