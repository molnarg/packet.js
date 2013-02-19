var Packet = require('..')
  , message = new Packet(new Buffer(1000))
  , socket = require('dgram').createSocket('udp4')

message.dns = {
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
}

socket.send(message.buffer, 0, message.dns.size, 53, '8.8.8.8')

socket.on('message', function(response) {
  response = new Packet(response)
  response.dns.answers.forEach(function(answer) {
    console.log(answer.name.toString(), '->', answer.rdata.toString())
  })

  process.exit()
})
