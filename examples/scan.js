// Parsing command line options
// usage: node examples/scan.js (source_ip) (target_ip) (first_port)-(last_port)
// source ip is needed for the tcp checksum calculation, but cannot read it from node
var source_ip = process.argv[2]
  , target_ip = process.argv[3]
  , first_port = Number(process.argv[4].split('-')[0])
  , last_port  = Number(process.argv[4].split('-')[1])

// Port states: untested, unknown, closed, open. Initially every port is untested.
var untested = [], unknown = [], closed = [], open = []
for (var port = first_port; port <= last_port; port++) untested.push(port)

// Creating the SYN packet
var Packet = require('..'), syn = new Packet(new Buffer(20)).tcp
syn.root.fill(0);
syn.set({
  srcport:  65535 - Math.floor(Math.random() * 100),  // A port probably unused by others
  flags: {
    syn:    true
  },
  options:  []  // There are no options. This sets the header length field to the appropriate value.
})

// Creating raw socket
var raw_socket = require('raw-socket')
  , socket = raw_socket.createSocket({ protocol: raw_socket.Protocol.TCP })

// Sending requests
var interval = setInterval(function() {
  if (untested.length === 0) return setTimeout(ready, 1000)
  unknown.push(syn.dstport)
  process.stdout.write('.')

  syn.dstport = untested.shift()
  syn.finalize({ src: source_ip, dst: target_ip })
  socket.send(syn.root, 0, syn.size, target_ip, function() {})
}, 20)

// Receiving responses
socket.on("message", function(buffer, source) {
  var response = new Packet(buffer).ipv4.tcp
  if (source !== target_ip || !response || unknown.indexOf(response.srcport) === -1) return

  unknown.splice(unknown.indexOf(response.srcport), 1)
  ;(response.flags.reset ? closed : open).push(response.srcport)
  if (unknown.concat(untested).length === 0) ready()
})

// Printing results
process.stdout.write('Testing')
function ready() {
  console.log()
  console.log('untested: ' + untested.join(', '))
  console.log('unknown: '  + unknown .join(', '))
  console.log('closed: '   + closed  .join(', '))
  console.log('open: '     + open    .join(', '))
  process.exit()
}
process.on('SIGINT', ready)
