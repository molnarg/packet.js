var Packet = require('..')
  , message = new Packet(new Buffer(1000)).dns
message.set({
  id:         1,
  flags:      0x0100,
  queries:    [{
    name:  process.argv[2],
    type:  'A',
    class: 'IN'
  }],
  answers:    [],
  auth:       [],
  additional: []
})

var socket = require('dgram').createSocket('udp4')
socket.send(message.buffer, 0, message.size, 53, '8.8.8.8')
socket.on('message', function(response) {
  Array.prototype.forEach.call(new Packet(response).dns.answers, function(answer) {
    console.log(answer.name.toString(), '->', answer.rdata.toString())
  })

  process.exit()
})
