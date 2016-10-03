// _.extend, but immutable by default
function extend (source, ...extensions) {
  return Object.assign({}, source, ...extensions)
}

// shortcut for creating an object with the given prototype and
//  properties with default behaviour
function create (proto, properties) {
  return Object.assign(Object.create(proto), properties)
}

module.exports = {
  extend,
  clone: extend,
  create
}
