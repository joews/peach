// _.extend, but immutable by default
function extend (source, ...extensions) {
  return Object.assign({}, source, ...extensions)
}

// shortcut for creating an object with the given prototype and
//  properties with default behaviour
function create (proto, properties) {
  return Object.assign(Object.create(proto), properties)
}

function restAndLast (arr) {
  const [last] = arr.slice(-1)
  const rest = arr.slice(0, -1)
  return [rest, last]
}

module.exports = {
  extend,
  clone: extend,
  create,
  restAndLast
}
