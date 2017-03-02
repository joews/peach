import unify from "./unify"
import { create, restAndLast } from "./util"
import PeachError from "./errors"
import { makeFunctionType } from "./types"

const ANONYMOUS = 'anonymous'

// Trampoline notes
// https://jsfiddle.net/v6j4a9qh/6/

// Make a user-defined function from an AST node
export function  makeFunction (functionNode, parentEnv, visit) {
  const { clauses } = functionNode
  const name = getName(functionNode)

  const arity = getArity(functionNode)

  const call = (...args) => {
    for (const { pattern, body } of clauses) {
      const { didMatch, bindings } = unify(pattern, args)
      if (didMatch !== false) {
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
        if (isFunctionCall(lastNode)) {
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

  const pFunction = {
    name,
    arity,
    call,
    toString
  }

  return pFunction
}

export function makeNativeFunction (name, jsFunction, argTypes, returnType) {
  const typeFix = makeFunctionType(argTypes, returnType)

  return {
    name,
    arity: argTypes.length,
    call: jsFunction,
    typeFix,
    toString: () => `built-in ${name}`
  }
}

export function applyFunction (pFunction, args) {
  // the type checker catches this; sanity check only
  if (args.length > pFunction.arity) {
    throw new PeachError(`Function ${pFunction.name} was called with too many arguments. It expected ${pFunction.maxArity} arguments, but it was called with ${args.length}: ${JSON.stringify(args)}`)
  }

  return (args.length >= pFunction.arity)
    ? call(pFunction, args)
    : curry(pFunction, args)
}


function getName (node) {
  return node.boundName || ANONYMOUS
}

// FIXME the type checker should annotate the function node with types and/or arity
function getArity (node) {
  return node.clauses[0].pattern.length
}

// (slow) tail call optimisation with a trampoline function
function call (pFunction, args) {
  return trampoline(pFunction.call, args)
}

function trampoline (fn, args) {
  let continuation = fn.apply(null, args)
  while (typeof continuation === 'function') {
    continuation = continuation()
  }

  return continuation
}

function curry (pFunction, appliedArgs) {
  return Object.assign({}, pFunction, {
    arity: pFunction.arity - appliedArgs.length,
    call: pFunction.call.bind(null, ...appliedArgs)
  })
}

function isFunctionCall (node) {
  return node.type === 'Call'
}
