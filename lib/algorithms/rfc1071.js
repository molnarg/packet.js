module.exports = function(buffer, offset, length) {
  offset = offset || 0
  length = length || buffer.length - offset

  var checksum = 0

  for (var cursor = 0; cursor < length; cursor += 2) {
    checksum += buffer.getUint16(offset + cursor)
    checksum = (checksum & 0xffff) + (checksum >> 16)
  }

  return 0xffff - checksum
}
