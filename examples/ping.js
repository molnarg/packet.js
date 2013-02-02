// Request packet
var Packet = require('..')
  , request = new Packet(new Buffer(1000)).icmp
request.set({
  type: 8,
  code: 0,
  details: {
    id: 1,
    seq: 0
  }
})

// Creating raw socket
var raw_socket = require('raw-socket')
  , socket = raw_socket.createSocket({ protocol: raw_socket.Protocol.ICMP })

// Sending requests
var target = process.argv[2]
  , transmitted = {}
setInterval(function() {
  request.details.seq = Math.floor(Math.random() * 65535)
  request.icmp.finalize()
  socket.send(request.root, 0, request.size, target, function(error, bytes) {})
  transmitted[request.details.seq] = process.hrtime()
}, 1000)

// Receiving responses
socket.on("message", function(buffer, source) {
  var response = new Packet(buffer).ipv4.icmp

  if (source === target && response && response.details.seq in transmitted) {
    var diff = process.hrtime(transmitted[response.details.seq])
    delete transmitted[response.details.seq]
    console.log((diff[0] * 1000 + Math.round(diff[1] / 10000) / 100) + ' ms')
  }
})
