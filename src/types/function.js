const unify = require('../unify')
const { create } = require('../util')
const { PeachError } = require('../errors')

const ANONYMOUS = 'anonymous'

// Trampoline notes
// https://jsfiddle.net/v6j4a9qh/6/

// Make a user-defined function from an AST node
module.exports = {
  makeFunction (functionNode, parentEnv, visit) {
    const { clauses } = functionNode
    const name = getName(functionNode)

    const [minArity, maxArity] = getArity(functionNode)

    const call = (...args) => {
      for (const { pattern, body } of clauses) {
        const { didMatch, bindings } = unify(pattern, args)
        if (didMatch !== false) {
          const env = create(parentEnv, bindings)

          // If the body is a function call (Peach functions have a single expression body),
          //  check if it's a tail call. If so return a thunk so we can use the trampoline
          //  pattern to avoid call stack overflow.
          if (isFunctionCall(body)) {
            const resolvedFunction = visit(body.values[0], env)[0]
            if (resolvedFunction === pFunction) {
              // evaluate the re-entrant args without recursing to `visit(body)`
              // there's some duplication here but it's necessary to avoid a potential
              //  overflow in recursive `call` calls that bypass the trampoline.
              const [, ...recurseArgExprs] = body.values
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
      minArity,
      maxArity,
      call,
      toString,
      isVariadic: false // no variadic UDFs in peach yet
    }

    return pFunction
  },

  // Make a built-in function from a JavaScript function
  // JavaScript functions have a single arity, so maxArity === minArity.
  makeNativeFunction (name, jsFunction, minArity = jsFunction.length, isVariadic = false) {
    return {
      name,
      minArity,
      maxArity: minArity,
      isVariadic,
      call: jsFunction
    }
  },

  applyFunction (pFunction, args) {
    if (!pFunction.isVariadic && args.length > pFunction.maxArity) {
      throw new PeachError(`Function ${pFunction.name} was called with too many arguments. It expected at most ${pFunction.maxArity} arguments, but it was called with ${args.length}: ${JSON.stringify(args)}`)
    }

    return (args.length >= pFunction.minArity)
      ? call(pFunction, args)
      : curry(pFunction, args)
  }
}

function getName (node) {
  return node.boundName || ANONYMOUS
}

function getArity (node) {
  const patternLengths = node.clauses.map(clause => clause.pattern.length)
  return [Math.min(...patternLengths), Math.max(...patternLengths)]
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
    minArity: pFunction.minArity - appliedArgs.length,
    maxArity: pFunction.maxArity - appliedArgs.length,
    call: pFunction.call.bind(null, ...appliedArgs)
  })
}

function isFunctionCall (node) {
  return node.type === 'List' && !node.isQuoted
}
