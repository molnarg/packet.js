var Template = require('../Template')
  , Packet = require('../Packet')
  , DomainName = require('./DomainName')
  , record_types = require('../tables/dns_record_types')
  , classes = require('../tables/dns_classes')


var ResourceRecord = Template.extend({
  name:       DomainName,
  type:       { size: 2, domain: record_types },
  class:      { size: 2, domain: classes },
  ttl:        4,
  rd_length:  2,
  rdata:      { size: 'rd_length' }
})


module.exports = Packet.extend({
  id:             2,
  flags:          2,
  count_queries:  2,
  count_answers:  2,
  count_auth_rr:  2,
  count_add_rr:   2,

  queries: {
    array: {
      name:       DomainName,
      type:       { size: 2, domain: record_types },
      class:      { size: 2, domain: classes }
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
})
