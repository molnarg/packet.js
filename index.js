module.exports = {
  views: {
    EthernetFrame: require('./lib/views/EthernetFrame')
  },
  stream: {
    decoder: require('./lib/streams/decoder'),
    printer: require('./lib/streams/printer')
  }
}
