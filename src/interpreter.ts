'use strict'
import { makeFunction, applyFunction } from './function'
import { extend, clone } from './util'
import PeachError from './errors'
import { getRootEnv } from './env'

export default function interpret (ast, rootEnv = getRootEnv()) {
  const [result, env] = visitAll(ast, rootEnv)
  return [result, env]
}

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

  Call ({ fn, args }, env) {
    const [fnResult] = visit(fn, env)
    const argResults = args.map((arg) => visit(arg, env)[0])
    return [applyFunction(fnResult, argResults), env]
  },

  Array ({ values }, env) {
    const results = values.map((value) => visit(value, env)[0])
    return [results, env]
  },

  Fn (node, env) {
    const fn = makeFunction(node, env, visit)
    return [fn, env]
  },

  If ({ condition, ifBranch, elseBranch }, env) {
    const [testResult] = visit(condition, env)
    const branch = (testResult) ? ifBranch : elseBranch

    return visit(branch, env)
  }
}
