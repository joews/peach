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

export type Visitor = (node: TypedNode, env: RuntimeEnv) => InterpreterResult

// Visit each of `nodes` in order, returning the result
// and environment of the last node.
function visitSerial (nodes: TypedNode[], rootEnv: RuntimeEnv): InterpreterResult {
  const initialState: [TypedNode, RuntimeEnv] = [nodes[0], rootEnv]
  return nodes.reduce(([, env], node) => (
    visit(node, env)
  ), initialState)
}

function visitUnknown (node: TypedNode, env: RuntimeEnv): InterpreterResult {
  console.log(JSON.stringify(node, null, 2))
  throw new PeachError(`unknown node type: ${node.kind}`)
}

function visit (node: TypedNode, env: RuntimeEnv): InterpreterResult {
  // console.log(`TRACE interpreter: ${node.type}\n${JSON.stringify(node)}`)

  switch (node.kind) {
    case 'Program':
      return visitProgram(node, env)
    case 'Def':
      return visitDef(node, env)
    case 'Name':
      return visitName(node, env)
    case 'Numeral':
      return visitNumeral(node, env)
    case 'Bool':
      return visitBool(node, env)
    case 'Str':
      return visitStr(node, env)
    case 'Call':
      return visitCall(node, env)
    case 'Array':
      return visitArray(node, env)
    case 'Fn':
      return visitFn(node, env)
    case 'If':
      return visitIf(node, env)
    default:
      throw new Error(`Uncrecognised AST node kind: ${node.kind}`)
  }
}

function visitProgram (node: TypedProgramNode, env: RuntimeEnv): InterpreterResult {
  return visitSerial(node.expressions, env)
}

function visitDef ({ name, value }: TypedDefNode, env: RuntimeEnv): InterpreterResult {
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
}

function visitName ({ name }: TypedNameNode, env: RuntimeEnv): InterpreterResult {
  if (!(name in env)) {
    throw new PeachError(`${name} is not defined`)
  }

  return [env[name], env]
}

function visitNumeral ({ value }: TypedNumeralNode, env: RuntimeEnv): InterpreterResult {
  return [value, env]
}

function visitBool ({ value }: TypedBooleanNode, env: RuntimeEnv): InterpreterResult {
  return [value, env]
}

function visitStr ({ value }: TypedStringNode, env: RuntimeEnv): InterpreterResult {
  return [value, env]
}

function visitCall ({ fn, args }: TypedCallNode, env: RuntimeEnv): InterpreterResult {
  const [fnResult] = visit(fn, env)
  const argResults = args.map((arg) => visit(arg, env)[0])
  return [applyFunction(fnResult, argResults), env]
}

function visitArray ({ values }: TypedArrayNode, env: RuntimeEnv): InterpreterResult {
  const results = values.map((value) => visit(value, env)[0])
  return [results, env]
}

function visitFn (node: TypedFunctionNode, env: RuntimeEnv): InterpreterResult {
  const fn = makeFunction(node, env, visit)
  return [fn, env]
}

function visitIf ({ condition, ifBranch, elseBranch }: TypedIfNode, env: RuntimeEnv): InterpreterResult {
  const [testResult] = visit(condition, env)
  const branch = (testResult) ? ifBranch : elseBranch

  return visit(branch, env)
}
