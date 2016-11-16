'use strict'
const { makeFunction, applyFunction } = require('./types/function')
const stdlib = require('./stdlib')
const { extend, clone } = require('./util')
const { PeachError } = require('./errors')

module.exports = function interpret (ast, rootEnv = getRootEnv()) {
  const [result, env] = visitAll(ast, rootEnv)

  return [result, env]
}

function getRootEnv () {
  return clone(stdlib)
}

// TODO a better way to expose the root environment
module.exports.getRootEnv = getRootEnv

// Visit each of `nodes` in order, returning the result
// and environment of the last node.
function visitAll (nodes, rootEnv) {
  return nodes.reduce(([, env], node) => (
    visit(node, env)
  ), [null, rootEnv])
}

function visitUnknown (node) {
  console.log(JSON.stringify(node, null, 2))
  throw new PeachError(`unknown node type: ${node.type}`)
}

function visit (node, env) {
  const visitor = visitors[node.type] || visitUnknown

  // console.log(`trace: ${node.type} ${node.name || ''}`)
  return visitor(node, env)
}

const visitors = {
  Def ({ name, value }, env) {
    if (env.hasOwnProperty(name)) {
      throw new PeachError(`${name} has already been defined`)
    }

    // Give the named value an inherent name property
    // This avoids the need for a seperate `defn`, though it fails where
    //  nodes are assigned to several names.
    const namedValue = extend(value, { boundName: name })

    // TODO immutable env
    const [result] = visit(namedValue, env)
    env[name] = result

    return [result, env]
  },

  Name ({ name }, env) {
    if (!(name in env)) {
      throw new PeachError(`${name} is not defined`)
    }

    return [env[name], env]
  },

  Numeral ({ value }, env) {
    return [value, env]
  },

  Bool ({ value }, env) {
    return [value, env]
  },

  Str ({ value }, env) {
    return [value, env]
  },

  List ({ values, isQuoted }, env) {
    const results = values.map((value) => visit(value, env)[0])

    if (isQuoted) {
      return [results, env]
    } else {
      const [fn, ...args] = results
      return [applyFunction(fn, args), env]
    }
  },

  Fn (node, env) {
    const fn = makeFunction(node, env, visit)
    return [fn, env]
  },

  If ({ clauses }, env) {
    for (const [test, consequent] of clauses) {
      // TODO a formal "else" concept - for now use `true`.
      const [testResult] = visit(test, env)
      if (isTruthy(testResult)) {
        return visit(consequent, env)
      }
    }

    // TODO fail to compile if not all outcomes are accounted for;
    // reutrn null until peach has static typing
    return [null, env]
  }
}

function isTruthy (value) {
  return value !== false && value != null
}
