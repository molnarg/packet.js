var protocols = require('./tables/protocols')
  , views = require('./views')

// Mapping from parent class to prototype to inject
var prototypes = {}

function Packet(buffer, protocol) {
  var packet

  if (buffer instanceof DataView) {
    packet = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    packet.__proto__ = prototypes.DataView

  } else if (typeof Buffer !== 'undefined' && buffer instanceof Buffer) {
    packet = buffer.slice(0)
    packet.__proto__ = prototypes.Buffer
  }

  packet.protocol = protocol

  return packet
}

var properties = {
  protocols: { get: function() {
    var protocols = []
      , view = this[this.protocol]

    while (view) {
      protocols.push(view.protocol)
      view = view.payload
    }

    return protocols
  }},

  set: { value: function(values) {
    this.protocol = values.protocol
    this[this.protocol] = values
  }}
}

Object.keys(protocols).forEach(function(protocol_name) {
  properties[protocol_name] = {
    get: function() {
      if (this.protocol === protocol_name) {
        // This is the root protocol
        var ViewClass = views[protocols[protocol_name]]
        return new ViewClass(this)

      } else {
        // This is not the root protocol, so stepping through the payload chain
        var view = this[this.protocol]

        // Go until the end of the chain or to the appropriate protocol
        while (!(view === undefined || view.protocol === protocol_name)) {
          view = view.payload
        }

        return view
      }
    },

    set: function(value) {
      var view = this[protocol_name]

      if (!view) {
        // New protocol. Push it at the top of the protocol stack
        if (!this.protocol) {
          // This is the first protocol in the stack
          this.protocol = protocol_name
          view = this[protocol_name]

        } else {
          // There is a stack already
          view = this[this.protocol]
          while (view.payload !== undefined) view = view.payload
          view.payload_protocol = protocol_name
          view = view.payload
        }
      }

      if (view.set) view.set(value)
    }
  }
})

if (typeof Buffer !== 'undefined') {
  prototypes.Buffer = Object.create(Buffer.prototype, properties)
}

prototypes.DataView = Object.create(DataView.prototype, properties)

module.exports = Packet
