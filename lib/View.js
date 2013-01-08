var tempView = new DataView(new ArrayBuffer(4))

Object.defineProperties(Buffer.prototype, {
  getUint8 : { value: Buffer.prototype.readUInt8    },
  getUint16: { value: Buffer.prototype.readUInt16BE },
  getUint32: { value: Buffer.prototype.readUInt32BE },
  setUint8 : { value: function(offset, value) { this.writeUInt8   (value, offset) } },
  setUint16: { value: function(offset, value) { this.writeUInt16BE(value, offset) } },
  setUint32: { value: function(offset, value) { this.writeUInt32BE(value, offset) } }
})

function copy(target, targetBitOffset, bitLength, source, sourceBitOffset) {
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
  for (var j = 0; j < sourceByteLength; j++) bytes[j] = source.getUint8(sourceByteOffset + j)
  if (targetByteLength > sourceByteLength || targetBeginPadding > sourceBeginPadding) bytes.unshift(0)

  var leftShift = (sourceBeginPadding - targetBeginPadding + 8) % 8
  for (var k = 0; k < bytes.length; k++) {
    bytes[k] = ((bytes[k] << leftShift) & 255) | ((bytes[k + 1] || 0) >> 8 - leftShift)
  }

  var beginMask = 255 >> targetBeginPadding
    , endMask = 255 << targetEndPadding
  bytes[0] &= beginMask
  bytes[0] |= ~beginMask & target.getUint8(targetByteOffset)
  bytes[targetByteLength - 1] &= endMask
  bytes[targetByteLength - 1] |= ~endMask & target.getUint8(targetByteOffset + targetByteLength - 1)

  for (var l = 0; l < targetByteLength; l++) target.setUint8(targetByteOffset + l, bytes[l])
}


function View(parent, offset) {
  Object.defineProperties(this, {
    parent: { value: parent, enumerable: true },
    offset: { value: offset || 0, enumerable: true }
  })
}

function declareAccessorFunctions(bitLength) {
  var length = bitLength
    , chunkLength = Math.pow(2, Math.max(3, Math.ceil(Math.log(length)/Math.log(2))))
    , tempOffset = chunkLength - length

    , tempChunkGet = tempView['getUint' + chunkLength].bind(tempView, 0)
    , tempChunkSet = tempView['setUint' + chunkLength].bind(tempView, 0)
    , tempClear = tempView.setUint32.bind(tempView, 0, 0)
    , tempPull = copy.bind(null, tempView, tempOffset, length)
    , tempPush = function(view, offset) { copy(view, offset, length, tempView, tempOffset) }

    , getName = 'getUint' + length
    , setName = 'setUint' + length

  Object.defineProperty(View.prototype, getName, { value: function(offset) {
    offset += this.offset

    if ((tempOffset === 0 && offset % 1 === 0) || this.parent instanceof View) {
      return this.parent[getName](offset)

    } else {
      tempClear()
      tempPull(this.parent, offset * 8)
      return tempChunkGet()
    }
  }})

  Object.defineProperty(View.prototype, setName, { value: function(offset, value) {
    offset += this.offset

    if ((tempOffset === 0 && offset % 1 === 0) || this.parent instanceof View) {
      this.parent[setName](offset, value)

    } else {
      tempChunkSet(value)
      tempPush()
    }
  }})
}

for (var length = 1; length <= 32; length++) declareAccessorFunctions(length)

View.copy = copy
module.exports = View
