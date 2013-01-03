var use_dataview = typeof Buffer === 'undefined'

function View(buffer, byteOffset, byteLength, Class) {
  var view = View.create(buffer, byteOffset, byteLength)

  if (Class) {
    if (!(Class.prototype instanceof View)) throw new TypeError('provided class should be subclass of View')

    // This changes the prototype chain
    // from this:  view --- (Buffer|DataView).prototype --- Object.prototype
    // to this:    view --- Constructor.prototype --- (Buffer|DataView).prototype --- Object.prototype
    // because the prototype of Constructor.prototype must be View.prototype which equals to (Buffer|DataView).prototype
    view.__proto__ = Class.prototype

  } else {
    view.__proto__ = View.prototype
  }

  return view
}

if (!use_dataview) {
  View.node = true

  function function_name(write, integer, signed, length, littleEndian) {
    return integer ?
                   (write ? 'write' : 'read') +
                   (signed ? '' : 'U') + 'Int' + length +
                   (length == 8 ? '' : (littleEndian ? 'LE' : 'BE'))
                   :
                   (write ? 'write' : 'read') +
                   (length === 32 ? 'Float' : 'Double') +
                   (littleEndian ? 'LE' : 'BE')
  }

  View.prototype = Object.create(Buffer.prototype, {
    get: { value: function(signed, length, littleEndian, byteOffset) {
      var fn = this[function_name(false, (signed !== null), signed, length, littleEndian)]

      if (byteOffset === undefined) return fn

      return fn.call(this, byteOffset)
    } },

    set: { value: function(signed, length, littleEndian, byteOffset, value) {
      var fn = this[function_name(true, (signed !== null), signed, length, littleEndian)]
        , self = this

      if (byteOffset === undefined) return function(byteOffset, value) { fn.call(this, value, byteOffset) }

      fn.call(this, value, byteOffset)
    } }
  })

  View.create = function(buffer, byteOffset, byteLength) {
    byteOffset = byteOffset || 0
    byteLength = byteLength || (buffer.length - byteOffset)

    var view = buffer.slice(byteOffset, byteOffset + byteLength)
    view.buffer = buffer
    view.byteOffset = byteOffset
    view.byteLength = byteLength

    return view
  }

} else {
  throw new Error('No supported Buffer implementation found.')
}

module.exports = View
