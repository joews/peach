import PeachError from './errors'
import { isArray, isEqual } from './array'
import { zip } from './util'
import { AstNode, AstLiteralNode, AstDestructuredArrayNode, Value, isAstLiteralNode } from './node-types'

interface Binding {
  [name: string]: Value
}

interface DidUnify {
  didMatch: true,
  bindings: {
    [name: string]: Value
  }
}

interface DidNotUnify {
  didMatch: false
}

type UnifyResult
  = DidUnify
  | DidNotUnify

export default function unify (patterns: AstNode[], values: Value[]): UnifyResult {
  if (patterns.length !== values.length) {
    return didNotMatch
  }

  const bindings = {}
  for (const [pattern, value] of zip(patterns, values)) {
    const attemptBind = unifyOne(pattern, value)
    if (attemptBind.didMatch == true) {
      Object.assign(bindings, attemptBind.bindings)
    } else {
      return didNotMatch
    }
  }

  return didMatch(bindings)
}

function unifyOne (pattern: AstNode, value: Value): UnifyResult {
  if (isAstLiteralNode(pattern) && pattern.value === value) {
    // the pattern matched, but there is nothing to bind
    return didMatch({})
  }

  if (pattern.kind === 'Name') {
    // the pattern matched; return a new binding
    return didMatch({ [pattern.name]: value })
  }

  // TODO generic value equality
  if (pattern.kind === 'Array' && isEqual(pattern.values, value)) {
    return didMatch({})
  }

  if (pattern.kind === 'DestructuredArray') {
    return destructure(pattern, value)
  }

  return didNotMatch
}

// TODO this will need to change when Array is a wrapped type
function destructure ({ head, tail }: AstDestructuredArrayNode, values: Value[]): UnifyResult {
  if (values.length === 0) {
    throw new PeachError(`Empty arrays cannot be destructured because they don't have a head`)
  }

  const boundHead = unifyOne(head, values[0])
  if (boundHead.didMatch) {
    const boundTail = unifyOne(tail, values.slice(1))
    if (boundTail.didMatch) {
      return didMatch(Object.assign(boundHead.bindings, boundTail.bindings))
    }
  }

  return didNotMatch
}

const didNotMatch: DidNotUnify = {
  didMatch: false
}

function didMatch (bindings: Binding): DidUnify {
  return {
    didMatch: true,
    bindings
  }
}
