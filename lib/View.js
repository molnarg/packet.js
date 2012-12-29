var tools = require('./tools')

function View(Constructor, buffer, byteOffset, byteLength) {
  var view = tools.view(buffer, byteOffset, byteLength)

  // This changes the prototype chain
  // from this:  view --- (Buffer|DataView).prototype --- Object.prototype
  // to this:    view --- Constructor.prototype --- (Buffer|DataView).prototype --- Object.prototype
  // because the prototype of Constructor.prototype must be View.prototype which equals to (Buffer|DataView).prototype
  view.__proto__ = Constructor.prototype

  return view
}

View.prototype = tools.node ? Buffer.prototype : DataView.prototype

module.exports = View
