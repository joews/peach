// _.extend, but immutable by default
export function extend (source, ...extensions) {
  return Object.assign({}, source, ...extensions)
}

export const clone = extend

// shortcut for creating an object with the given prototype and
//  properties with default behaviour
export function create (proto, properties = null) {
  return Object.assign(Object.create(proto), properties)
}

export function restAndLast (arr) {
  const [last] = arr.slice(-1)
  const rest = arr.slice(0, -1)
  return [rest, last]
}
