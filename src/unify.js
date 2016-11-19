const { PeachError } = require('./errors')
const { isList, isEqual } = require('./list')

module.exports = function unify (patterns, values) {
  if (patterns.length !== values.length) {
    return didNotMatch
  }

  const bindings = {}
  for (const [pattern, value] of zip(patterns, values)) {
    const attemptBind = unifyOne(pattern, value)
    if (attemptBind !== null) {
      Object.assign(bindings, attemptBind)
    } else {
      return didNotMatch
    }
  }

  return didMatch(bindings)
}

function unifyOne (pattern, value) {
  // TODO value equality operator
  if (isValue(pattern) && pattern.value === value) {
    // the pattern matched, but there is nothing to bind
    return {}
  }

  if (isName(pattern)) {
    // the pattern matched; return a new binding
    return { [pattern.name]: value }
  }

  // TODO generic value equality
  if (isList(pattern) && isEqual(pattern.values, value)) {
    return {}
  }

  if (isDestructuredList(pattern)) {
    return destructure(pattern, value)
  }

  // no match
  return null
}

// TODO this will need to change when List is a wrapped type
function destructure ({ head, tail }, list) {
  if (list.length === 0) {
    throw new PeachError(`Empty lists cannot be destructured because they don't have a head`)
  }

  const boundHead = unifyOne(head, list[0])
  if (boundHead !== null) {
    const boundTail = unifyOne(tail, list.slice(1))
    if (boundTail) {
      return Object.assign(boundHead, boundTail)
    }
  }

  return null
}

const didNotMatch = {
  didMatch: false
}

function didMatch (bindings) {
  return {
    didMatch: true,
    bindings
  }
}

// TODO these belong with type definitions
function isName ({ type }) {
  return type === 'Name'
}

function isValue ({ type }) {
  return ['Bool', 'Str', 'Numeral'].includes(type)
}

function isDestructuredList ({ type }) {
  return type === 'DestructuredList'
}

// TODO stdlib
function zip (listA, listB) {
  return listA.map((e, i) => [e, listB[i]])
}

