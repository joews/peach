const unify = require('./unify')
const { create } = require('./util')
const { PeachError } = require('./errors')
const { makeFunctionType } = require('./types')

const ANONYMOUS = 'anonymous'

// Trampoline notes
// https://jsfiddle.net/v6j4a9qh/6/

// Make a user-defined function from an AST node
module.exports = {
  makeFunction (functionNode, parentEnv, visit) {
    const { clauses } = functionNode
    const name = getName(functionNode)

    const arity = getArity(functionNode)

    const call = (...args) => {
      for (const { pattern, body } of clauses) {
        const { didMatch, bindings } = unify(pattern, args)
        if (didMatch !== false) {
          const env = create(parentEnv, bindings)

          // If the body is a function call (Peach functions have a single expression body),
          //  check if it's a tail call. If so return a thunk so we can use the trampoline
          //  pattern to avoid call stack overflow.
          if (isFunctionCall(body)) {
            const resolvedFunction = visit(body.fn, env)[0]
            if (resolvedFunction === pFunction) {
              // evaluate the re-entrant args without recursing to `visit(body)`
              // there's some duplication here but it's necessary to avoid a potential
              //  overflow in recursive `call` calls that bypass the trampoline.
              const recurseArgExprs = body.args
              const recurseArgs = recurseArgExprs.map(expr => visit(expr, env)[0])
              return () => call(...recurseArgs)
            }
          }

          const [returnValue] = visit(body, env)
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
  },

  // TODO WH
  // > add the type args to the node in a way that gets them into the typechecker's initial env
  // Make a built-in function from a JavaScript function
  makeNativeFunction (name, jsFunction, argTypes, returnType) {
    const typeFix = makeFunctionType(argTypes, returnType)

    return {
      name,
      arity: argTypes.length,
      call: jsFunction,
      typeFix,
      toString: () => `built-in ${name}`
    }
  },

  applyFunction (pFunction, args) {
    // FIXME the type checker shoould catch this
    if (args.length > pFunction.arity) {
      throw new PeachError(`Function ${pFunction.name} was called with too many arguments. It expected ${pFunction.maxArity} arguments, but it was called with ${args.length}: ${JSON.stringify(args)}`)
    }

    return (args.length >= pFunction.arity)
      ? call(pFunction, args)
      : curry(pFunction, args)
  }
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
