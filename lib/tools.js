
if (typeof Buffer !== 'undefined') {
  // node.js
  module.exports = {
    view : function(buffer, offset, length) {
      var begin = offset || 0
      var end = length ? (begin + length) : buffer.length

      return buffer.slice(begin, end)
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
    view : function(buffer, offset, length) {

    }
  }

} else {
  throw new Error('No supported Buffer implementation found.')
}