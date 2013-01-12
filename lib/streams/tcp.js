var util = require('util')
  , Stream = require('stream')

function TCPConnection(a, b) {
  a.stream = new Stream()
  a.stream.readable = true
  a.stream.connection = this
  a.unacknowledged = {}
  a.fin = false

  b.stream = new Stream()
  b.stream.readable = true
  b.stream.connection = this
  b.unacknowledged = {}
  b.fin = false

  this.a = a
  this.b = b
  this.readable = true
}

util.inherits(TCPConnection, Stream)

TCPConnection.prototype.process = function(packet) {
  this.emit('data', packet)

  var ip = packet.ipv4
    , tcp = packet.tcp
    , src = (this.a.ip === ip.src.toString() && this.a.port === tcp.srcport) ? this.a : this.b
    , dst = (src === this.a) ? this.b : this.a
    , payload = tcp.payload

  // Store the sent content until it is acknowledged
  if (payload && payload.root_offset !== packet.length) {
    src.unacknowledged[tcp.seq] = packet.slice(payload.root_offset)
  }

  // Emitting acknowledged data
  var buffer, last, ack = tcp.ack
  for (var seq in dst.unacknowledged) {
    if (!dst.unacknowledged.hasOwnProperty(seq)) continue

    buffer = dst.unacknowledged[seq]
    last = Number(seq) + buffer.length - 1

    if (last < ack) {
      delete dst.unacknowledged[seq]
      dst.stream.emit('data', buffer)
    }
  }

  // Ending the streams and the connection
  if (tcp.flags.fin) src.fin = true
  if (tcp.flags.ack && dst.fin) dst.stream.emit('end')
  if (src.fin && tcp.fin) this.emit('end')
}

TCPConnection.prototype.toString = function() {
  return this.a.ip + ':' + this.a.port + ' - ' + this.b.ip + ':' + this.b.port
}

var TCPDemux = function () {
  this.connections = {}
}

util.inherits(TCPDemux, Stream)

TCPDemux.prototype.writable = true

TCPDemux.prototype.write = function (packet) {
  var ip = packet.ipv4
    , tcp = packet.tcp
  if (!tcp) return

  var src = ip.src + ':' + tcp.srcport
    , dst = ip.dst + ':' + tcp.dstport
    , key = [src, dst].sort().join(' - ')
    , connections = this.connections
    , connection = connections[key]

  if (!connection) {
    connection = new TCPConnection({ ip: ip.src.toString(), port: tcp.srcport }, { ip: ip.dst.toString(), port: tcp.dstport })
    connections[key] = connection
    connection.on('end', function() { delete connections[key] })
    this.emit('connection', connection.a.stream, connection.b.stream, connection)
  }

  connection.process(packet)
}

TCPDemux.prototype.end = function (packet) {
  if (packet) this.write(packet)
}

module.exports = function() {
  return new TCPDemux()
}
