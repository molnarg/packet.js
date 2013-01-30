var protocols = require('./tables/protocols')
  , views = require('./views')
  , Template = require('./Template')
  , View = require('./View')

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

  payload_view: {
    get: function() {
      return new View(this)
    }
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
  }
})

var protocol_properties = {}

Object.keys(protocols).forEach(function(protocol_name) {
  protocol_properties[protocol_name] = {
    get: function() {
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

    set: function(value) {
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
