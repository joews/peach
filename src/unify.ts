import PeachError from './errors'
import { isArray, isEqual } from './array'
import { zip } from './util'
import { AstNode, AstLiteralNode, AstDestructuredArrayNode, Value, isAstLiteralNode } from './node-types'

// FIXME tagged union - with didMatch: false, there are never bindings.
type binding = { [name: string]: Value }

interface unification {
  didMatch: boolean,
  bindings: binding
}

export default function unify (patterns: AstNode[], values: Value[]): unification {
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

function unifyOne (pattern: AstNode, value: Value): binding {
  if (isAstLiteralNode(pattern) && pattern.value === value) {
    // the pattern matched, but there is nothing to bind
    return {}
  }

  if (pattern.type === 'Name') {
    // the pattern matched; return a new binding
    return { [pattern.name]: value }
  }

  // TODO generic value equality
  if (pattern.type === 'Array' && isEqual(pattern.values, value)) {
    return {}
  }

  if (pattern.type === 'DestructuredArray') {
    return destructure(pattern, value)
  }

  // no match
  return null
}

// TODO this will need to change when Array is a wrapped type
function destructure ({ head, tail }: AstDestructuredArrayNode, values: Value[]): binding {
  if (values.length === 0) {
    throw new PeachError(`Empty arrays cannot be destructured because they don't have a head`)
  }

  const boundHead = unifyOne(head, values[0])
  if (boundHead !== null) {
    const boundTail = unifyOne(tail, values.slice(1))
    if (boundTail) {
      return Object.assign(boundHead, boundTail)
    }
  }

  return null
}

const didNotMatch: unification = {
  didMatch: false,
  bindings: {}
}

function didMatch (bindings: binding): unification {
  return {
    didMatch: true,
    bindings
  }
}
