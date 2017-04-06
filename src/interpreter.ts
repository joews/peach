'use strict'
import { makeFunction, applyFunction, PeachFunction } from './function'
import { extend, clone } from './util'
import PeachError from './errors'
import { getRootEnv, RuntimeEnv } from './env'
import {
  Value, TypedAst, TypedNode, TypedProgramNode, TypedDefNode, TypedIdentifierNode,
  TypedNumberNode, TypedBooleanNode, TypedStringNode, TypedCallNode, TypedArrayNode,
  TypedDestructuredArrayNode, TypedFunctionNode, TypedIfNode, TypedTupleNode, TypedMemberNode,
  TypedBinaryOperatorNode, AstCallNode
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
    case 'Identifier':
      return visitName(node, env)
    case 'Number':
      return visitNumeral(node, env)
    case 'Boolean':
      return visitBool(node, env)
    case 'String':
      return visitStr(node, env)
    case 'Call':
      return visitCall(node, env)
    case 'Array':
      return visitArray(node, env)
    case 'Function':
      return visitFn(node, env)
    case 'If':
      return visitIf(node, env)
    case 'Tuple':
      return visitTuple(node, env)
    case 'Member':
      return visitMember(node, env)
    case 'BinaryOperator':
      return visitBinaryOperator(node, env)
    default:
      throw new Error(`Uncrecognised AST node kind: ${node}`)
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

function visitName ({ name }: TypedIdentifierNode, env: RuntimeEnv): InterpreterResult {
  if (!(name in env)) {
    throw new PeachError(`${name} is not defined`)
  }

  return [env[name], env]
}

function visitNumeral ({ value }: TypedNumberNode, env: RuntimeEnv): InterpreterResult {
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

function visitTuple({ values }: TypedTupleNode, env: RuntimeEnv): InterpreterResult {
  const results = values.map((value) => visit(value, env)[0])
  return [results, env]
}

function visitMember({ source, name }: TypedMemberNode, env: RuntimeEnv): InterpreterResult {
  const [sourceValue] = visit(source, env);
  const [index] = visit(name, env);

  // TODO runtime types for Array and Type
  const result = sourceValue[index as number]

  return [result, env]
}

// TODO an AST rewrite step could translate BinaryOperator into Call to avoid
// repetition here
function visitBinaryOperator({ operator, left, right, type }: TypedBinaryOperatorNode, env: RuntimeEnv): InterpreterResult {
  const fn: PeachFunction = env[operator]

  const [leftResult] = visit(left, env)
  const [rightResult] = visit(right, env)

  const result = applyFunction(fn, [leftResult, rightResult])
  return [result, env]
}
