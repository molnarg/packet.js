var Template = require('bt').Template
  , Packet = require('../Packet')
  , DomainName = require('./DomainName')
  , record_types = require('../tables/dns_record_types')
  , record_payloads = require('../tables/dns_record_payloads')
  , classes = require('../tables/dns_classes')
  , views = require('../views')

var ResourceRecord = Template.extend({
  name:       DomainName,
  type:       { size: 2, domain: record_types },
  class:      { size: 2, domain: classes },
  ttl:        4,
  rd_length:  2,
  rdata:      { size: 'this.rd_length', view: function() { return views[record_payloads[this.type]] } }
})

module.exports = Packet.extend({
  id:              2,

  flags: {
    response:      1/8,
    opcode:        4/8,
    authoritative: 1/8,
    truncated:     1/8,
    recdesired:    1/8,
    recavail:      1/8,
    reserved:      3/8,
    rcode:         4/8
  },

  count: {
    queries:       2,
    answers:       2,
    auth_rr:       2,
    add_rr:        2
  },

  queries: {
    array: {
      name:       DomainName,
      type:       { size: 2, domain: record_types },
      class:      { size: 2, domain: classes }
    },
    length:       'this.parent.count.queries'
  },

  answers: {
    array:        ResourceRecord,
    length:       'this.parent.count.answers'
  },

  auth: {
    array:        ResourceRecord,
    length:       'this.parent.count.auth_rr'
  },

  additional: {
    array:        ResourceRecord,
    length:       'this.parent.count.add_rr'
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
})
