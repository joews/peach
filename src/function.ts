import unify from './unify'
import { create, restAndLast } from './util'
import PeachError from './errors'
import { Type, makeFunctionType } from './types'
import { TypedFunctionNode, Value } from './node-types'
import { RuntimeEnv } from './env'
import { Visitor } from './interpreter'

const ANONYMOUS = 'anonymous'

export interface PeachFunction {
  name: string,
  arity: number, // TODO deprecate
  call: (args: Value[]) => Value,
  toString: () => string
}

// Trampoline notes
// https://jsfiddle.net/v6j4a9qh/6/

// Make a user-defined function from an AST node
export function makeFunction (functionNode: TypedFunctionNode, parentEnv: RuntimeEnv, visit: Visitor) {
  const { clauses } = functionNode
  const name = getName(functionNode)

  const arity = getArity(functionNode)

  const call = (...args: Value[]) => {
    for (const { pattern, body } of clauses) {
      const unifyResult = unify(pattern, args)
      if (unifyResult.didMatch) {
        const { bindings } = unifyResult
        const env = create(parentEnv, bindings)

        // For now only the last node can be a tail-recursive function call.
        // This isn't right, because in `if a then b else b`, both `b` and `c` could
        // be tail-recursive.
        const [otherNodes, lastNode] = restAndLast(body)
        for (const node of otherNodes) {
          visit(node, env)
        }

        // If the last node is a function call,
        //  check if it's a tail call. If so return a thunk so we can use the trampoline
        //  pattern to avoid call stack overflow. As above - this test needs refining
        // to include any terminal expression in a function.
        if (lastNode.type === 'Call') {
          const resolvedFunction = visit(lastNode.fn, env)[0]
          if (resolvedFunction === pFunction) {
            // evaluate the re-entrant args without recursing to `visit(lastNode)`
            // there's some duplication here but it's necessary to avoid a potential
            //  overflow in recursive `call` calls that bypass the trampoline.
            const recurseArgExprs = lastNode.args
            const recurseArgs = recurseArgExprs.map(expr => visit(expr, env)[0])
            return () => call(...recurseArgs)
          }
        }

        const [returnValue] = visit(lastNode, env)
        return returnValue
      }
    }

    // TODO in the future this will be unrechable; a complete set of patterns
    //  will be a compile-time requirement.
    throw new PeachError(`λ: ${name} has no clause that matches the given arguments (${args})`)
  }

  const toString = () => `λ: ${name}`

  const pFunction: PeachFunction = {
    name,
    arity,
    call,
    toString
  }

  return pFunction
}

export function makeNativeFunction (name: string, jsFunction: Function, argTypes: Type[], returnType: Type) {
  const exprType = makeFunctionType(argTypes, returnType)

  return {
    name,
    arity: argTypes.length,
    call: jsFunction,
    exprType,
    toString: () => `built-in ${name}`
  }
}

export function applyFunction (pFunction: PeachFunction, args: Value[]) {
  // the type checker catches this; sanity check only
  if (args.length > pFunction.arity) {
    throw new PeachError(`Function ${pFunction.name} was called with too many arguments. It expected ${pFunction.arity} arguments, but it was called with ${args.length}: ${JSON.stringify(args)}`)
  }

  return (args.length >= pFunction.arity)
    ? call(pFunction, args)
    : curry(pFunction, args)
}

// FIXME include boundName in BaseAstNode?
function getName (node: any) {
  return node.boundName || ANONYMOUS
}

// FIXME the type checker should annotate the function node with types and/or arity
function getArity (node: TypedFunctionNode) {
  return node.clauses[0].pattern.length
}

// (slow) tail call optimisation with a trampoline function
function call (pFunction: PeachFunction, args: Value[]) {
  return trampoline(pFunction.call, args)
}

function trampoline (fn: Function, args: any[]) {
  let continuation = fn.apply(null, args)
  while (typeof continuation === 'function') {
    continuation = continuation()
  }

  return continuation
}

function curry (pFunction: PeachFunction, appliedArgs: Value[]) {
  return Object.assign({}, pFunction, {
    arity: pFunction.arity - appliedArgs.length,
    call: pFunction.call.bind(null, ...appliedArgs)
  })
}
