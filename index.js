module.exports = require('./lib/Packet')

module.exports.views = require('./lib/views')

module.exports.stream = {
  decoder: require('./lib/streams/decoder'),
  filter: require('./lib/streams/filter'),
  printer: require('./lib/streams/printer'),
  tcp: require('./lib/streams/tcp')
}
