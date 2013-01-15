module.exports = {
  views: require('./lib/views'),
  stream: {
    decoder: require('./lib/streams/decoder'),
    filter: require('./lib/streams/filter'),
    printer: require('./lib/streams/printer'),
    tcp: require('./lib/streams/tcp')
  }
}
