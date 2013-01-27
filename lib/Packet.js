var protocols = require('./tables/protocols')
  , views = require('./views')
  , Template = require('./Template')

var Packet = module.exports = Template.extend({
  payload: {
    get: function() {
      var ViewClass = views[protocols[this.payload_protocol]]

      return ViewClass && new ViewClass(this, this.payload_view.offset)
    },
    set: function(value) {
      this.payload_protocol = value.protocol
      var payload = this.payload
      if (payload.set) payload.set(value)
    },
    enumerable: true
  },

  protocols: {
    get: function() {
      var protocols = []
        , view = this

      while (view) {
        protocols.push(view.protocol)
        view = view.payload
      }

      return protocols
    },
    enumerable: true
  },

  set: { value: function(values) {
    this.protocol = values.protocol
    this[this.protocol] = values
  }}
})

var protocol_properties = {}

Object.keys(protocols).forEach(function(protocol_name) {
  protocol_properties[protocol_name] = {
    get: function() {
      // This is the root protocol
      if (this.protocol === protocol_name) return this

      // This is not the root protocol, so stepping through the payload chain
      var view = this

      // Go until the end of the chain or to the appropriate protocol
      while (!(view === undefined || view.protocol === protocol_name)) {
        view = view.payload
      }

      return view
    },

    set: function(value) {
      var view = this[protocol_name]

      if (!view) {
        // New protocol. Push it at the top of the protocol stack
        view = this
        while (view.payload !== undefined) view = view.payload
        view.payload_protocol = protocol_name
        view = view.payload
      }

      if (view.set) view.set(value)
    }
  }
})

Object.defineProperties(Packet.prototype, protocol_properties)
