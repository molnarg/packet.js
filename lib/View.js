var buffer_defined = typeof Buffer !== 'undefined'
  , fields = require('./fields')
  , tempView = new DataView(new ArrayBuffer(4))

var chunkLengths = {}
for (var i = 1; i <= 32; i++) {
  chunkLengths[i] = Math.pow(2, Math.max(3, Math.ceil(Math.log(i)/Math.log(2))))
}

function View(parent, offset) {
  Object.defineProperties(this, {
    parent: { value: parent, enumerable: true },
    offset: { value: offset || 0, enumerable: true }
  })
}

// Forwarding implementation
View.forwarding_prototype = Object.create(null, {
  getUint: { value: function(length, offset, littleEndian) {
    return this.parent.getUint(length, this.offset + offset, littleEndian)
  }},
  setUint: { value: function(length, offset, value, littleEndian) {
    this.parent.setUint(length, this.offset + offset, value, littleEndian)
  }}
})

// Buffer based implementation
View.buffer_prototype = Object.create(null, {
  getUint: { value: function(length, offset, littleEndian) {
    var chunkLength = chunkLengths[length]
      , tempOffset = chunkLength - length

    offset += this.offset

    if (offset % 8 === 0 && tempOffset === 0) {
      // There are build-in functions for this bit length and bitOffset is 0
      var chunkReadFn = 'readUInt' + chunkLength + (length === 8 ? '' : (littleEndian ? 'LE' : 'BE'))
      return this.parent[chunkReadFn](offset / 8)

    } else {
      tempView.setUint32(0, 0)
      fields.copy(this.parent, offset, length, tempView, tempOffset)
      return tempView['getUint' + chunkLength](0, littleEndian)
    }
  }},

  getUint8: { value: function(byteOffset) {
    return this.parent.readUInt8(this.offset / 8 + byteOffset)
  }},

  setUint: { value: function(length, offset, value, littleEndian) {
    var chunkLength = chunkLengths[length]
      , tempOffset = chunkLength - length

    offset += this.offset

    if (offset % 8 === 0 && tempOffset === 0) {
      // There are build-in functions for this bit length and bitOffset is 0
      var chunkWriteFn = 'writeUInt' + chunkLength + (length === 8 ? '' : (littleEndian ? 'LE' : 'BE'))
      return this.parent[chunkWriteFn](value, offset / 8)

    } else {
      tempView['setUint' + chunkLength](0, value, littleEndian)
      fields.copy(tempView, tempOffset, length, this.parent, offset)
    }
  }},

  setUint8: { value: function(byteOffset, value) {
    return this.parent.writeUInt8(value, this.offset / 8 + byteOffset)
  }}
})

// DataView based implementation
View.dataview_prototype = Object.create(null, {

})

// Choosing implementation when a function is first called
function lazyMethod(name) {
  return { get: function() {
    var implementation

    if (this.parent instanceof View) {
      implementation = View.forwarding_prototype

    } else if (buffer_defined && this.parent instanceof Buffer) {
      implementation = View.buffer_prototype

    } else if (this.parent instanceof DataView) {
      implementation = View.dataview_prototype

    } else {
      throw new Error('Parent must be View, Buffer or DataView.')
    }

    Object.defineProperty(this, name, { value: implementation[name] })

    return this[name]
  }}
}

// Common functions
View.prototype = Object.create(null, {
  getUint: lazyMethod('getUint'),
  setUint: lazyMethod('setUint')
})

module.exports = View
