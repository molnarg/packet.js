var tools = require('../lib/tools')
  , View = require('../lib/View')

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

function shift(string, offset, begin, end) {
  if (begin != null || end != null) {
    return string.slice(0, begin) + shift(string.slice(begin, end), offset) + string.slice(end)

  } else if (offset < 0) {
    offset = Math.min(-offset, string.length)
    return string.slice(offset) + Array(offset + 1).join('0')

  } else {
    offset = Math.min(offset, string.length)
    return Array(offset + 1).join('0') + string.slice(0, string.length - offset)
  }
}

describe("A property ganareted by tools.", function() {
  var buffer = tools.node ? (new Buffer(10)) : (new ArrayBuffer(10))
    , bufferView = new View(buffer)
    , reference = tools.node ? (new Buffer(4)) : (new ArrayBuffer(4))
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
        Object.defineProperty(bufferView, 'prop', tools.field(t.byteOffset, 0, t.bitLength, t.signed, t.littleEndian))
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
        Object.defineProperty(bufferView, 'prop', tools.field(t.byteOffset, t.bitOffset, t.bitLength))
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

describe("tools.shift(view, offset, begin, end)", function() {
  var buffer = tools.node ? (new Buffer(10)) : (new ArrayBuffer(10))
    , bufferView = new View(buffer)

  // Generating testcases
  var tests = [], begin
  for (var i = 0; i < 100; i++) tests.push({
    begin: begin = random(buffer.length),
    end: begin + 1 + random(buffer.length - begin - 1),
    offset: (random(7) + 1) * ((Math.random() < 0.5) ? 1 : -1)   // -7 - 7 except 0
  })

  it('should shift the bits of the given view (from bytes begin - end) by offset', function() {
    tests.forEach(function(t, i) {
      // Filling the buffer with random bytes
      for (var i = 0; i < buffer.length; i++) bufferView.writeUInt8(random(256), i)

      // Saving the original state, shifting the data and saving the new state
      var originalState = bitStringView(bufferView)
      tools.shift(bufferView, t.offset, t.begin, t.end)
      var newState = bitStringView(bufferView)

      // Comparing result with string shifting result
      var bitBegin = t.begin * 8
        , bitEnd = t.end * 8
        , shiftedState = shift(originalState, t.offset, bitBegin, bitEnd)
      expect(newState).toBe(shiftedState)

      if (false)
      console.log( (shiftedState === newState ? 'successful ' : 'unsuccessful ')
                 + 'shifting by ' + t.offset + ' from ' + t.begin + ' to ' + t.end + '\n'
                 + 'original ' + emphasize(originalState, bitBegin, bitEnd, 8) + '\n'
                 + 'new      ' + emphasize(newState     , bitBegin, bitEnd, 8) + '\n'
                 + 'expected ' + emphasize(shiftedState , bitBegin, bitEnd, 8) + '\n'
                 )
    })
  })
})
