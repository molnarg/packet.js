var Template = require('../Template')
  , Packet = require('../Packet')
  , DomainName = require('./DomainName')


function ResourceRecord(parent, offset) {
  Template.call(this, parent, offset)
}

ResourceRecord.structure = {
  name:       DomainName,
  type:       2,
  class:      2,
  ttl:        4,
  rd_length:  2,
  rdata:      { size: 'rd_length' }
}

ResourceRecord.prototype = Template.create(Template.prototype, ResourceRecord.structure)


function DNSPacket(parent, offset) {
  Packet.call(this, parent, offset)
}

DNSPacket.structure = {
  id:             2,
  flags:          2,
  count_queries:  2,
  count_answers:  2,
  count_auth_rr:  2,
  count_add_rr:   2,

  queries: {
    array: {
      name:       DomainName,
      type:       2,
      class:      2
    },
    length:       'parent.count_queries'
  },

  answers: {
    array:        ResourceRecord,
    length:       'parent.count_answers'
  },

  auth: {
    array:        ResourceRecord,
    length:       'parent.count_auth_rr'
  },

  additional: {
    array:        ResourceRecord,
    length:       'parent.count_add_rr'
  },

  protocol:       { value: 'dns' },

  toString: { value: function() {
    var queries = Array.prototype.slice.call(this.queries)
      , answers = Array.prototype.slice.call(this.answers)

    var string = queries.map(function(query) {
      return query.name.toString() + '?'
    }).join(' ')

    string += ' ' + answers.map(function(answer) {
      return answer.name.toString() + '!'
    }).join(' ')

    return 'DNS ' + string
  }}
}

DNSPacket.prototype = Template.create(Packet.prototype, DNSPacket.structure)

module.exports = DNSPacket
