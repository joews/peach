const unify = require('../unify')
const { create } = require('../util')
const { PeachError } = require('../errors')

const ANONYMOUS = 'anonymous'

// Make a user-defined function from an AST node
module.exports = {
  makeFunction (functionNode, parentEnv, visit) {
    const { clauses } = functionNode
    const name = getName(functionNode)

    const [minArity, maxArity] = getArity(functionNode)

    return {
      name,
      minArity,
      maxArity,
      isVariadic: false, // no variadic UDFs in peach yet
      call (...args) {
        for (const { pattern, body } of clauses) {
          const { didMatch, bindings } = unify(pattern, args)
          if (didMatch !== false) {
            const env = create(parentEnv, bindings)

            const [returnValue] = visit(body, env)
            return returnValue
          }
        }

        // TODO in the future this will be unrechable; a complete set of patterns
        //  will be a compile-time requirement.
        throw new PeachError(`λ: ${name} has no clause that matches the given arguments (${args})`)
      },

      toString () {
        // TODO include the source for UDFs
        return `λ: ${name}`
      }
    }
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

function call (pFunction, args) {
  return pFunction.call.apply(null, args)
}

function curry (pFunction, appliedArgs) {
  return Object.assign({}, pFunction, {
    minArity: pFunction.minArity - appliedArgs.length,
    maxArity: pFunction.maxArity - appliedArgs.length,
    call: pFunction.call.bind(null, ...appliedArgs)
  })
}
