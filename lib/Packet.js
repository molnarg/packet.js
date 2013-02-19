var protocols = require('./tables/protocols')
  , views = require('./views')
  , bt = require('bt')
  , Template = bt.Template
  , View = bt.View

View.prototype.toString = function() { return '?' }

var Packet = module.exports = Template.extend({
  payload: {
    get: function getPayload() {
      var ViewClass = views[protocols[this.payload_protocol]]

      return ViewClass ? (new ViewClass(this, this.__offset_payload_view, this.__max_size_payload_view)) : (this.payload_view)
    },
    set: function setPayload(value) {
      this.payload_protocol = value.protocol
      var payload = this.payload
      if (payload.set) payload.set(value)
    },
    enumerable: true
  },

  payload_view: {
    get: function getPayloadView() {
      return new Template(this)
    }
  },

  protocols: {
    get: function getProtocols() {
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

  toString: { value: function toString() {
    var payload = this.payload

    if (this.protocol) {
      // This is a concrete protocol but there's no toString() implementation
      return this.protocol.toUpperCase() + (payload ? (' | ' + payload.toString()) : '')

    } else {
      // This is a generic packet
      return payload && payload.toString()
    }
  }}
})

var protocol_properties = {}

Object.keys(protocols).forEach(function(protocol_name) {
  protocol_properties[protocol_name] = {
    get: function getConcreteProtocol() {
      // This is the root protocol
      if (this.protocol === protocol_name) return this

      // If there's no defined payload protocol, then interpret the payload as protocol_name and return it
      if (!this.payload_protocol) return new views[protocols[protocol_name]](this, this.payload_view.offset)

      // This is not the root protocol, so stepping through the payload chain
      var view = this

      // Go until the end of the chain or to the appropriate protocol
      while (!(view === undefined || view.protocol === protocol_name)) {
        view = view.payload
      }

      return view
    },

    set: function setConcreteProtocol(value) {
      var view = this

      while (!(view.payload_protocol === undefined || view.payload_protocol === protocol_name)) {
        view = view.payload
      }

      value.protocol = protocol_name
      view.payload = value
    }
  }
})

Object.defineProperties(Packet.prototype, protocol_properties)
