// _.extend, but immutable by default
export function extend (source: any, ...extensions: any[]) {
  return Object.assign({}, source, ...extensions)
}

export const clone = extend

// shortcut for creating an object with the given prototype and
//  properties with default behaviour
export function create (proto: any, properties: any = null) {
  return Object.assign(Object.create(proto), properties)
}

export function restAndLast<T> (arr: T[]): [T[], T] {
  const _last = last(arr)
  const rest = arr.slice(0, -1)
  return [rest, _last]
}

export function last<T> (arr: T[]): T {
  return arr[arr.length - 1]
}

export function zip<A, B> (a: A[], b: B[]): [A, B][] {
  return a.map((aValue, i): [A, B] => {
    const bValue = b[i]
    return [aValue, bValue]
  })
}
