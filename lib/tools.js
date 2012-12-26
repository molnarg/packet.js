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

tools.field = function(byteOffset, bitOffset, bitLength, signed, littleEndian) {
  if (bitOffset === 0 && bitLength % 8 === 0 && bitLength <= 32) {
    // Simple function call
    var postfix = (signed ? '' : 'U') + 'Int' + bitLength + (bitLength == 8 ? '' : (littleEndian ? 'LE' : 'BE'))
      , read = tools['read' + postfix]
      , write = tools['write' + postfix]

    return {
      get: function() { return read(this, byteOffset) },
      set: function(value) { write(this, value, byteOffset) },
      configurable: true
    }

  } else {
    // Not implemented yet.
    return undefined
  }
}

module.exports = tools
