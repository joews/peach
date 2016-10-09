'use strict'
const { makeFunction, applyFunction } = require('./types/function')
const stdlib = require('./stdlib')
const { extend, clone } = require('./util')
const { PeachError } = require('./errors')

module.exports = function interpret (ast, rootEnv = getRootEnv()) {
  const [result, env] = visitAll(ast, rootEnv)

  return [result, env]
}

let stack = [];

function getRootEnv () {
  return clone(stdlib)
}

// Visit each of `nodes` in order, returning the result
// and environment of the last node.
function visitAll (nodes, rootEnv) {
  return nodes.reduce(([, env], node) => (
    visit(node, env)
  ), [null, rootEnv])
}

module.exports.debug = function (ast, rootEnv = getRootEnv()) {
  let i = 0;
  visit(ast[i], rootEnv);
  debugger

  function next() {
    debugger
    const n = stack.pop();
    if (n) {
      // we have a waiting instruction, so execute it and return the result
      const [result, env] = n()
      return {
        result, env, next
      }
    } else if (++i < ast.length) {
      // put the next stop-level line of the program onto the call stack
      // execute it immediate so we don't need two `next` calls to get the value
      visit(ast[i], rootEnv);
      return next();
    } else {
      // the program is finished
      // todo this should keep the last state, just not return null.
      return { done: true }
    }

  }

  return next;
}

function visitUnknown (node) {
  console.log(JSON.stringify(node, null, 2))
  throw new PeachError(`unknown node type: ${node.type}`)
}

function visit (node, env) {
  const visitor = visitors[node.type] || visitUnknown

  // console.log(`trace: ${node.type} ${node.name || ''}`)
  // return visitor(node, env)
  stack.push(() => visitor(node, env));
}

const visitors = {
  Def ({ name, value }, env) {
    require("chalkline").magenta();
    console.log(name)
    if (env.hasOwnProperty(name)) {
      throw new Error(`${name} has already been defined`)
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
