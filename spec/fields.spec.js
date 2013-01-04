var fields = require('../lib/fields')
  , View = require('../lib/View')
  , read  = Function.prototype.call.bind(View.prototype.get(false, 8))
  , write = Function.prototype.call.bind(View.prototype.set(false, 8))

function random(range, signed) {
  return (signed ? range / -2 : 0) + Math.floor(Math.random() * range)
}

function byteArrayView(view) {
  var array = Array(view.length)
  for (var i = 0; i < view.length; i++) array[i] = view.readUInt8(i)
  return array
}

function bitStringView(view) {
  return byteArrayView(view).map(function(n) {
    var bits = new Array(8)
    for (var i = 0; i < 8; i++) bits[i] = (n & (128 >> i)) ? 1 : 0
    return bits.join('')
  }).join('')
}

function partition(string, length, separator) {
  var partitions = []
  while(string.length > length) {
    partitions.push(string.slice(0, length))
    string = string.slice(length)
  }
  partitions.push(string)
  return partitions.join(typeof separator === 'string' ? separator : '-')
}

function emphasize(string, begin, end, partitions) {
  if (partitions) {
    string = partition(string, partitions)
    begin += Math.floor(begin / partitions)
    end += Math.floor(end / partitions)
  }
  return string.slice(0, begin) + ' | ' + string.slice(begin, end) + ' | ' + string.slice(end)
}

describe("A property ganareted by tools.", function() {
  var buffer = fields.node ? (new Buffer(10)) : (new ArrayBuffer(10))
    , bufferView = new View(buffer)
    , reference = fields.node ? (new Buffer(4)) : (new ArrayBuffer(4))
    , referenceView = new View(reference)

  // Random buffer content
  for (var i = 0; i < buffer.length; i++) bufferView.writeUInt8(random(256), i)

  describe('field(byteOffset, bitOffset = 0, bitLength = 8|16|32, signed, littleEndian)', function() {
    // Generating testcases
    var tests = [], bitLength
    for (var i = 0; i < 100; i++) tests.push({
      bitLength: bitLength = [8, 16, 32][random(3)],
      signed: Math.random() < 0.5,
      byteOffset: random(buffer.length + 1 - bitLength / 8),
      littleEndian: Math.random() < 0.5
    })

    it("should write and read the data to/from the appropriate position", function() {
      tests.forEach(function(t, i) {
        // Defining the property and generating random data to be written
        delete bufferView.prop
        Object.defineProperty(bufferView, 'prop', fields.field(t.byteOffset, 0, t.bitLength, t.signed, t.littleEndian))
        var data = random(Math.pow(2, t.bitLength), t.signed)

        // Saving the original state, writing data through the property and saving the new state
        var originalState = byteArrayView(bufferView)
        bufferView.prop = data
        var newState = byteArrayView(bufferView)

        // Reading back the data through the property
        expect(bufferView.prop).toBe(data);

        // Reading back the data through the view
        expect(bufferView.get(t.signed, t.bitLength, t.littleEndian, t.byteOffset)).toBe(data);

        // Everything else must be unchanged
        newState.splice(t.byteOffset, t.bitLength / 8)
        originalState.splice(t.byteOffset, t.bitLength / 8)
        expect(newState).toEqual(originalState)
      })
    })
  })

  describe('field(byteOffset, bitOffset != 0, bitLength != 8|16|32)', function() {
    // Generating testcases
    var tests = [], bitLength, bitOffset
    for (var i = 0; i < 100; i++) tests.push({
      bitLength: bitLength = random(32) + 1,
      bitOffset: bitOffset = random(7) + 1,
      byteOffset: random(buffer.length + 1 - Math.ceil((bitLength + bitOffset) / 8))
    })

    it("should write and read the data to/from the appropriate position", function() {
      tests.forEach(function(t, i) {
        // Defining the property and generating random data to be written
        Object.defineProperty(bufferView, 'prop', fields.field(t.byteOffset, t.bitOffset, t.bitLength))
        var data = random(Math.pow(2, t.bitLength), t.signed)

        // Saving the original state, writing data through the property and saving the new state
        var originalState = bitStringView(bufferView)
        bufferView.prop = data
        var newState = bitStringView(bufferView)

        // Reading back the data through the property
        expect(bufferView.prop).toBe(data);

        // Reading back the data through the view

        // Everything else must be unchanged
        var offset = t.byteOffset * 8 + t.bitOffset
        if (false)
        console.log( 'writing ' + data + '\n'
                   + emphasize(originalState, offset, offset + t.bitLength, 8) + '\n'
                   + emphasize(newState     , offset, offset + t.bitLength, 8) + '\n'
                   )
        newState = newState.substr(0, offset).concat(newState.substr(offset + t.bitLength))
        originalState = originalState.substr(0, offset).concat(originalState.substr(offset + t.bitLength))
        expect(newState).toEqual(originalState)
      })
    })
  })
})

describe("fields.copy(source, sourceBitOffset, bitLength, target, targetBitOffset)", function() {
  var length = 10
    , source = fields.node ? (new Buffer(length)) : (new ArrayBuffer(length))
    , target = fields.node ? (new Buffer(length)) : (new ArrayBuffer(length))
    , sourceView = new View(source)
    , targetView = new View(target)

  // Generating testcases
  var tests = [], test
  for (var i = 0; i < 100; i++) {
    tests.push(test = {})

    test.bitLength = random(length * 8) + 1
    test.sourceBitOffset = random(length * 8 - test.bitLength + 1)
    test.targetBitOffset = random(length * 8 - test.bitLength + 1)

    for (var j = 0; j < length; j++) {
      write(sourceView, j, random(256))
      write(targetView, j, random(256))
    }

    test.sourceBefore = bitStringView(sourceView)
    test.targetBefore = bitStringView(targetView)
    fields.copy(sourceView, test.sourceBitOffset, test.bitLength, targetView, test.targetBitOffset)
    test.sourceAfter = bitStringView(sourceView)
    test.targetAfter = bitStringView(targetView)
  }

  it('should copy the given bit array from "source" to "target"', function() {
    tests.forEach(function(t, i) {
      var source = t.sourceBefore.substr(t.sourceBitOffset, t.bitLength)
        , target = t.targetAfter.substr(t.targetBitOffset, t.bitLength)

      if (source !== target)
      console.log( i + '. ' + t.bitLength + ' bits ' + t.sourceBitOffset + ' -> ' + t.targetBitOffset
                 + '\n' + emphasize(source, 0, source.length, 8)
                 + '\n' + emphasize(target, 0, target.length, 8)
                 )

      expect(source).toBe(target)
    })
  })

  it('should not modify anything else in the "target"', function() {
    tests.forEach(function(t, i) {
      var before = t.targetBefore
        , after = t.targetAfter

      before = before.substr(0, t.targetBitOffset).concat(before.substr(t.targetBitOffset + t.bitLength))
      after  = after .substr(0, t.targetBitOffset).concat(after .substr(t.targetBitOffset + t.bitLength))

      if (before !== after)
      console.log( i + '. ' + t.bitLength + ' bits ' + t.sourceBitOffset + ' -> ' + t.targetBitOffset
                 + '\n' + emphasize(t.sourceBefore, t.sourceBitOffset, t.sourceBitOffset + t.bitLength, 8)
                 + '\n' + emphasize(t.targetBefore, t.targetBitOffset, t.targetBitOffset + t.bitLength, 8)
                 + '\n' + emphasize(t.targetAfter , t.targetBitOffset, t.targetBitOffset + t.bitLength, 8)
                 )

      expect(before).toBe(after)
    })
  })

  it('should not modify anything else in the "source"', function() {
    tests.forEach(function(t, i) {
      var before = t.sourceBefore
        , after = t.sourceAfter

      before = before.substr(0, t.sourceBitOffset).concat(before.substr(t.sourceBitOffset + t.bitLength))
      after  = after .substr(0, t.sourceBitOffset).concat(after .substr(t.sourceBitOffset + t.bitLength))

      expect(before).toBe(after)
    })
  })
})
