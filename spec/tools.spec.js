
function random(range, signed) {
  return (signed ? range / -2 : 0) + Math.floor(Math.random() * range)
}

function byteArrayView(view) {
  var array = Array(view.length)
  for (var i = 0; i < view.length; i++) array[i] = view.readUInt8(i)
  return array
}

describe("A property ganareted by tools.", function() {
  var tools = require('../lib/tools')
    , buffer = tools.node ? (new Buffer(10)) : (new ArrayBuffer(10))
    , bufferView = tools.view(buffer)
    , reference = tools.node ? (new Buffer(4)) : (new ArrayBuffer(4))
    , referenceView = tools.view(reference)

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
        var postfix = (t.signed ? '' : 'U') + 'Int' + t.bitLength + (t.bitLength == 8 ? '' : (t.littleEndian ? 'LE' : 'BE'))
          , read = tools['read' + postfix]
        expect(read(bufferView, t.byteOffset)).toBe(data);

        // Everything else must be unchanged
        newState.splice(t.byteOffset, t.bitLength / 8)
        originalState.splice(t.byteOffset, t.bitLength / 8)
        expect(newState).toEqual(originalState)
      })
    });
  })
});

