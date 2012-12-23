
if (typeof Buffer !== 'undefined') {
  // node.js
  module.exports = {
    node: true,
    view : function(buffer, offset, length) {
      offset = offset || 0
      length = length || (buffer.length - offset)

      var view = buffer.slice(offset, offset + length)
      view.buffer = buffer
      view.byteOffset = offset
      view.byteLength = length

      return view
    }
  }

  // read and write methods
  Object.keys(Buffer.prototype).filter(function(methodname) {
    return methodname.indexOf('read') === 0 || methodname.indexOf('write') === 0
  }).forEach(function(methodname) {
    module.exports[methodname] = Function.prototype.call.bind(Buffer.prototype[methodname])
  })

} else if (typeof DataView !== 'undefined') {
  // Browser
  module.exports = {
    node: false,
    view : function(buffer, offset, length) {

    }
  }

} else {
  throw new Error('No supported Buffer implementation found.')
}
