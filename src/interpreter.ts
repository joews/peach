'use strict'
import { makeFunction, applyFunction } from './function'
import { extend, clone } from './util'
import PeachError from './errors'
import { getRootEnv, RuntimeEnv } from './env'
import {
  Value, Ast, TypedAst, AstNode, AstProgramNode, AstDefNode, AstNameNode,
  AstNumeralNode, AstBooleanNode, AstStringNode, AstCallNode, AstArrayNode,
  AstDestructuredArrayNode, AstFunctionNode, AstIfNode,
  isAstNameNode
} from './node-types'

export type InterpreterResult = [Value, RuntimeEnv]

export default function interpret (ast: TypedAst, rootEnv: RuntimeEnv = getRootEnv()): InterpreterResult {
  const [result, env] = visit(ast, rootEnv)
  return [result, env]
}

type Visitor = (node: AstNode, env: RuntimeEnv) => InterpreterResult

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

function visit (node: AstNode, env: RuntimeEnv) {
  const visitor = visitors[node.type] || visitUnknown

  return visitor(node, env)
}

const visitors: { [nodeType: string]: Visitor } = {
  Program (node: AstProgramNode, env) {
    return visitSerial(node.expressions, env)
  },

  Def ({ name, value }: AstDefNode, env) {
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

  Name ({ name }: AstNameNode, env) {
    if (!(name in env)) {
      throw new PeachError(`${name} is not defined`)
    }

    return [env[name], env]
  },

  Numeral ({ value }: AstNumeralNode, env) {
    return [value, env]
  },

  Bool ({ value }: AstBooleanNode, env) {
    return [value, env]
  },

  Str ({ value }: AstStringNode, env) {
    return [value, env]
  },

  Call ({ fn, args }: AstCallNode, env) {
    const [fnResult] = visit(fn, env)
    const argResults = args.map((arg) => visit(arg, env)[0])
    return [applyFunction(fnResult, argResults), env]
  },

  Array ({ values }: AstArrayNode, env) {
    const results = values.map((value) => visit(value, env)[0])
    return [results, env]
  },

  Fn (node: AstFunctionNode, env) {
    const fn = makeFunction(node, env, visit)
    return [fn, env]
  },

  If ({ condition, ifBranch, elseBranch }: AstIfNode, env) {
    const [testResult] = visit(condition, env)
    const branch = (testResult) ? ifBranch : elseBranch

    return visit(branch, env)
  }
}
