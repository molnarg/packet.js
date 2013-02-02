var View = require('./View')
  , propertyExpression = require('./propertyExpression')

function Template(parent, offset) {
  View.call(this, parent, offset)
}

Template.prototype = Object.create(View.prototype, {
  __size_undefined: { value: 0 },
  __offset_undefined: { value: 0 },

  size: { get: function() {
    return (this['__offset_' + this.__last] + this['__size_' + this.__last])
  }},

  valueOf: { value: function() {
    var size = this.size
    return (size <= 4) ? this['getUint' + size * 8](0) : undefined
  }},

  set: { value: function(values) {
    if (typeof values === 'object') {
      for (var key in values) {
        this[key] = values[key]
      }

    } else if (typeof values === 'number' && this.size <= 4) {
      this['setUint' + (this.size * 8)](0, values)
    }
  }},

  unstable: {
    get: function() {
      return this.parent.unstable
    },
    set: function(value) {
      Object.defineProperty(this, 'unstable', { value: value })
    },
    configurable: true
  }
})

Template.defineProperty = function(object, name, desc) {
  if (desc instanceof Array) {
    defineParallelProperties(object, name, desc)

  } else if (typeof desc === 'function' || (typeof desc === 'object' && desc.view instanceof Function)) {
    defineTypedProperty(object, name, desc)

  } else if (typeof desc === 'number' || 'size' in desc || 'offset' in desc) {
    defineBitfieldProperty(object, name, desc)

  } else if ('array' in desc) {
    defineArrayProperty(object, name, desc)

  } else if ('value' in desc || 'get' in desc || 'set' in desc) {
    Object.defineProperty(object, name, desc)

  } else {
    defineNestedProperties(object, name, desc)
  }
}

Template.defineProperties = function(object, properties) {
  var names = properties._order || Object.keys(properties)

  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    Template.defineProperty(object, name, properties[name])
  }
}

Template.create = function(prototype, descriptor) {
  var structure = Object.create(prototype)

  Template.defineProperties(structure, descriptor)

  return structure
}

Template.extend = function(structure) {
  var ParentClass = this

  var TemplateClass = structure.init || function TemplateClass(parent, offset) {
    ParentClass.call(this, parent, offset)
  }
  delete structure.init

  TemplateClass.structure = structure
  TemplateClass.extend = Template.extend

  TemplateClass.prototype = Template.create(ParentClass.prototype, structure)

  return TemplateClass
}

function defineBitfieldProperty(object, name, desc) {
  if (!(desc instanceof Object)) desc = { size: desc }

  var offset = '__offset_' + name, size = '__size_' + name, little_endian = '__littleendian_' + name
    , prev_offset = '__offset_' + object.__last, prev_size = '__size_' + object.__last

  propertyExpression(object, offset, desc.offset || function() { return this[prev_offset] + this[prev_size] })
  propertyExpression(object, size, desc.size)
  propertyExpression(object, little_endian, desc.little_endian)

  var domain = desc.domain || (desc.size === 1/8 ? { 0: false, 1 : true } : {})
    , reverse_domain = {}
  for (var n in domain) reverse_domain[domain[n]] = Number(n)

  Object.defineProperty(object, name, {
    get: function() {
      var len = this[size] * 8
      if (!len || len > 32) return new View(this, this[offset])

      var value = this['getUint' + len](this[offset], this[little_endian])
      value = (value in domain) ? domain[value] : value

      var error = desc.assert && desc.assert.call(this, value)
      if (error) throw new Error('Assertion Error: ' + this.protocol + '.' + name + ' ' + error)

      return value
    },

    set: function(value) {
      var len = this[size] * 8
      if (len > 32) return

      if (value in reverse_domain) value = reverse_domain[value]

      var error = desc.assert && desc.assert.call(this, value)
      if (error) throw new Error('Assertion Error: ' + this.protocol + '.' + name + ' ' + error)

      this['setUint' + len](this[offset], value, this[little_endian])
    },

    enumerable: true
  })

  object.__last = name
}

function defineTypedProperty(object, name, desc) {
  if (typeof desc === 'function') desc = { view: desc }

  var offset = '__offset_' + name, size = '__size_' + name, type = '__type_' + name
    , prev_offset = '__offset_' + object.__last, prev_size = '__size_' + object.__last

  var buildtime_offset = propertyExpression(object, offset, desc.offset || function() { return this[prev_offset] + this[prev_size] })
  var buildtime_view   = propertyExpression(object, type, desc.view)

  Object.defineProperty(object, name, {
    get: function() {
      var nested_object = new this[type](this, this[offset])

      // The offset is constant, so the nested object can be cached safely
      // TODO: cache in a way that doesn't destroy the setter
      // if (buildtime_offset !== null) Object.defineProperty(this, name, { value: nested_object })

      return nested_object
    },

    set: function(value) {
      var nested_object = this[name]
      if (nested_object.set) nested_object.set(value)
    }
  })

  try {
    var prototype_size = Object.create(buildtime_view.prototype).size
  } catch (e) {
    // There's no buildtime information about the type, or it has no buildtime length property
  }
  propertyExpression(object, size, desc.size || prototype_size || function() { return this[name].size })

  object.__last = name
}

function defineParallelProperties(object, name, properties) {
  var previous = object.__last

  for (var i = 0; i < properties.length; i++) {
    object.__last = previous
    Template.defineProperties(object, properties[i])
  }
}

function defineArrayProperty(object, name, desc) {
  var List = require('./List')

  var ListType = List.extend(desc)

  defineTypedProperty(object, name, ListType)
}

function defineNestedProperties(object, name, desc) {
  if (!desc.__view) {
    var prototype = Template.create(Template.prototype, desc)
    desc.__view = function NestedStructure(parent, offset) { Template.call(this, parent, offset) }
    desc.__view.prototype = prototype
  }

  defineTypedProperty(object, name, { view: desc.__view })
}

module.exports = Template
