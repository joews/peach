'use strict'
import { makeFunction, applyFunction } from './function'
import { extend, clone } from './util'
import PeachError from './errors'
import { getRootEnv, RuntimeEnv } from './env'
import {
  Value, TypedAst, TypedNode, TypedProgramNode, TypedDefNode, TypedNameNode,
  TypedNumeralNode, TypedBooleanNode, TypedStringNode, TypedCallNode, TypedArrayNode,
  TypedDestructuredArrayNode, TypedFunctionNode, TypedIfNode
} from './node-types'

export type InterpreterResult = [Value, RuntimeEnv]

export default function interpret (ast: TypedAst, rootEnv: RuntimeEnv = getRootEnv()): InterpreterResult {
  const [result, env] = visit(ast, rootEnv)
  return [result, env]
}

type Visitor = (node: TypedNode, env: RuntimeEnv) => InterpreterResult

// Visit each of `nodes` in order, returning the result
// and environment of the last node.
function visitSerial (nodes, rootEnv) {
  return nodes.reduce(([, env], node) => (
    visit(node, env)
  ), [null, rootEnv])
}

function visitUnknown (node, env): InterpreterResult {
  console.log(JSON.stringify(node, null, 2))
  throw new PeachError(`unknown node type: ${node.type}`)
}

function visit (node: TypedNode, env: RuntimeEnv) {
  const visitor = visitors[node.type] || visitUnknown
  // console.log(`TRACE interpreter: ${node.type} of ${node.exprType}`)
  return visitor(node, env)
}

const visitors: { [nodeType: string]: Visitor } = {
  Program (node: TypedProgramNode, env) {
    return visitSerial(node.expressions, env)
  },

  Def ({ name, value }: TypedDefNode, env) {
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

  Name ({ name }: TypedNameNode, env) {
    if (!(name in env)) {
      throw new PeachError(`${name} is not defined`)
    }

    return [env[name], env]
  },

  Numeral ({ value }: TypedNumeralNode, env) {
    return [value, env]
  },

  Bool ({ value }: TypedBooleanNode, env) {
    return [value, env]
  },

  Str ({ value }: TypedStringNode, env) {
    return [value, env]
  },

  Call ({ fn, args }: TypedCallNode, env) {
    const [fnResult] = visit(fn, env)
    const argResults = args.map((arg) => visit(arg, env)[0])
    return [applyFunction(fnResult, argResults), env]
  },

  Array ({ values }: TypedArrayNode, env) {
    const results = values.map((value) => visit(value, env)[0])
    return [results, env]
  },

  Fn (node: TypedFunctionNode, env) {
    const fn = makeFunction(node, env, visit)
    return [fn, env]
  },

  If ({ condition, ifBranch, elseBranch }: TypedIfNode, env) {
    const [testResult] = visit(condition, env)
    const branch = (testResult) ? ifBranch : elseBranch

    return visit(branch, env)
  }
}
