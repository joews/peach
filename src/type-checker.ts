import { create, extend, last } from './util'
import PeachError from './errors'
import { TypeEnv } from './env'

import {
  Ast, AstNode, AstProgramNode, AstDefNode, AstNameNode,
  AstNumeralNode, AstBooleanNode, AstStringNode, AstCallNode, AstArrayNode,
  AstDestructuredArrayNode, AstFunctionNode, AstIfNode,
  TypedAst, TypedNode, TypedProgramNode, TypedDefNode, TypedNameNode,
  TypedNumeralNode, TypedBooleanNode, TypedStringNode, TypedCallNode, TypedArrayNode,
  TypedDestructuredArrayNode, TypedFunctionNode, TypedFunctionClauseNode, TypedIfNode
} from './node-types'

import {
  Type,
  TypeVariable,
  TypeOperator,
  ArrayType,
  NumberType,
  StringType,
  BooleanType,
  makeFunctionType
} from './types'

export default function analyse (ast: Ast, typedEnv: TypeEnv): TypeCheckResult<TypedAst> {
  return visit(ast, typedEnv, new Set<Type>()) as TypeCheckResult<TypedAst>
}

export type TypeCheckResult<T extends TypedNode> = [T, TypeEnv]
type TypeCheckVisitor<T extends TypedNode> = (node: AstNode, env: TypeEnv, nonGeneric: Set<Type>) => TypeCheckResult<T>

// Visit a list of Nodes, returning the typed node and environment of the last Node.
function visitSerial (nodes: AstNode[], env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedNode> {
  const initialState: TypeCheckResult<TypedNode> = [null, env]

  return nodes.reduce(([, nextEnv], nextNode) =>
    visit(nextNode, nextEnv, nonGeneric)
  , initialState)
}

// Visit a list of nodes, each in the returned env of the previous step.
// Return an array of their resolved types and the last environment.
// TODO DRY visitSerial to use this function
// TODO static type for `nodes` - the callback throws type errors for nodes: AstNode[]
function visitAll (nodes: any[], rootEnv: TypeEnv, nonGeneric: Set<any>): [TypedNode[], TypeEnv] {
  const initialState: [TypedNode[], TypeEnv] = [[], rootEnv]

  return nodes.reduce(([nodes, env]: [TypedNode[], TypeEnv], node) => {
    const [outNode, outEnv] = visit(node, env, nonGeneric)
    return [[...nodes, outNode], outEnv]
  }, initialState)
}

function visit (node: AstNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedNode> {
  // console.log(`TRACE typecheck: ${node.type}\n${JSON.stringify(node)}`)

  switch (node.type) {
    case 'Program':
      return visitProgram(node, env, nonGeneric)
    case 'Def':
      return visitDef(node, env, nonGeneric)
    case 'Name':
      return visitName(node, env, nonGeneric)
    case 'Numeral':
      return visitNumeral(node, env)
    case 'Bool':
      return visitBool(node, env)
    case 'Str':
      return visitStr(node, env)
    case 'Call':
      return visitCall(node, env, nonGeneric)
    case 'Array':
      return visitArray(node, env, nonGeneric)
    case 'DestructuredArray':
      return visitDestructuredArray(node, env, nonGeneric)
    case 'Fn':
      return visitFn(node, env, nonGeneric)
    case 'If':
      return visitIf(node, env, nonGeneric)
    default:
      throw new Error(`Uncrecognised AST node type: ${node.type}`)
  }
}

function visitProgram (node: AstProgramNode, env, nonGeneric): TypeCheckResult<TypedProgramNode> {
  const [expressions, finalEnv] = visitAll(node.expressions, env, nonGeneric)
  const programType = typeOf(last(expressions))

  const typedNode = { ...node, expressions, exprType: programType }
  return [typedNode, finalEnv]
}

function visitDef (node: AstDefNode, env, nonGeneric): TypeCheckResult<TypedDefNode> {
  if (env.hasOwnProperty(node.name)) {
    throw new PeachError(`${node.name} has already been defined`)
  }

  // allow for recursive binding by binding ahead of evaluating the child
  // analogous to Lisp's letrec, but in the enclosing scope.
  // TODO immutable env
  const t = new TypeVariable()
  env[node.name] = { ...node, exprType: t }

  // if we are defining a function, mark the new identifier as
  //  non-generic inside the evaluation of the body.
  const innerNonGeneric = (node.value.type === 'Fn')
    ? new Set([...nonGeneric, t])
    : nonGeneric

  const [value] = visit(node.value, env, innerNonGeneric)
  unify(typeOf(value), t)

  const typedNode = { ...node, value, exprType: t }
  return [typedNode, env]
}

function visitName (node: AstNameNode, env, nonGeneric): TypeCheckResult<TypedNameNode> {
  if (!(node.name in env)) {
    throw new PeachError(`${node.name} is not defined`)
  }

  const envType = typeOf(env[node.name])
  const freshType = fresh(envType, nonGeneric)

  const typedNode = { ...node, exprType: freshType }
  return [typedNode, env]
}

function visitNumeral (node: AstNumeralNode, env): TypeCheckResult<TypedNumeralNode> {
  return [{...node, exprType: NumberType }, env]
}

function visitBool (node: AstBooleanNode, env): TypeCheckResult<TypedBooleanNode> {
  return [{ ...node, exprType: BooleanType }, env]
}

function visitStr (node: AstStringNode, env): TypeCheckResult<TypedStringNode> {
  return [{ ...node, exprType: StringType }, env]
}

function visitCall (node: AstCallNode, env, nonGeneric): TypeCheckResult<TypedCallNode> {
  const [fn] = visit(node.fn, env, nonGeneric)
  const args: TypedNode[] = node.args.map((arg) => visit(arg, env, nonGeneric)[0])

  const returnType = new TypeVariable()
  const callFunctionType: Type = makeFunctionType(typesOf(args), returnType)

  unify(callFunctionType, typeOf(fn))

  const typedNode = { ...node, fn: fn as TypedFunctionNode, args, exprType: returnType }
  return [typedNode, env]
}

function visitArray (node: AstArrayNode, env, nonGeneric): TypeCheckResult<TypedArrayNode> {
  let itemType
  let typedValues

  if (node.values.length > 0) {
    typedValues = node.values.map((value) => visit(value, env, nonGeneric)[0])
    const types = typedValues.map(value => value.exprType)

    // arrays are homogenous: all items must have the same type
    unifyAll(types)
    itemType = types[0]
  } else {
    itemType = new TypeVariable()
    typedValues = []
  }

  const arrayType = new ArrayType(itemType)
  const typedNode = { ...node, values: typedValues, exprType: arrayType }

  return [typedNode, env]
}

function visitDestructuredArray (node: AstDestructuredArrayNode, env, nonGeneric): TypeCheckResult<TypedDestructuredArrayNode> {
  const { head, tail } = node

  const boundHeadType = new TypeVariable()
  const boundTailType = new ArrayType(new TypeVariable())

  // TODO immutable env
  if (head.type === 'Name') {
    const typedHead: TypedNameNode = { ...head, exprType: boundHeadType }
    env[head.name] = typedHead
    nonGeneric.add(boundHeadType)
  }

  if (tail.type === 'Name') {
    const typedTail: TypedNameNode = { ...tail, exprType: boundTailType }
    env[tail.name] = typedTail
    nonGeneric.add(boundTailType)
  }

  const [typedHead] = visit(head, env, nonGeneric)
  const [typedTail] = visit(tail, env, nonGeneric)

  const headType = typeOf(typedHead)
  const tailType = typeOf(typedTail)

  // the tail must be a array of the head type
  // the usage types of head and tail must match the declared types
  unify(boundHeadType, boundTailType.getType())
  unify(headType, boundHeadType)
  unify(tailType, boundTailType)

  const typedNode = { ...node, head: typedHead, tail: typedTail, exprType: tailType }
  return [typedNode, env]
}

function visitFn (node: AstFunctionNode, parentEnv, outerNonGeneric): TypeCheckResult<TypedFunctionNode> {
  // TODO clauses must be exhaustive - functions must accept any input of the right types
  const clauses: TypedFunctionClauseNode[] = node.clauses.map((clauseNode) => {
    const nonGeneric = new Set([...outerNonGeneric])
    const env = create(parentEnv)

    // get the array of arg types
    const pattern: TypedNode[] = clauseNode.pattern.map(argNode => {
      // If this is a `Name` arg, define it in the function's arguments environment.
      // if it's a destructured array we need to recursively define any named children,
      // so visiting the node will define its names.
      if (argNode.type === 'Name') {
        const argType = new TypeVariable()
        const typedArgNode: TypedNameNode = { ...argNode, exprType: argType }

        env[argNode.name] = typedArgNode
        nonGeneric.add(argType)
      }

      const [typedArgNode] = visit(argNode, env, nonGeneric)
      return typedArgNode
    })

    const body = clauseNode.body.map(bodyNode => visit(bodyNode, env, nonGeneric)[0])
    const lastBodyNode = last(body)
    const returnType = prune(typeOf(lastBodyNode))

    const patternTypes = pattern.map(typeOf)

    const clauseType: Type = makeFunctionType(patternTypes, returnType)
    return { ...clauseNode, pattern, body, exprType: clauseType }
  })

  // all clauses must have tbe same type
  unifyAll(typesOf(clauses))

  const typedNode = { ...node, clauses, exprType: typeOf(clauses[0])}
  return [typedNode, parentEnv]
}

function visitIf (node: AstIfNode, env, nonGeneric): TypeCheckResult<TypedIfNode> {
  const [condition] = visit(node.condition, env, nonGeneric)
  const [ifBranch] = visit(node.ifBranch, env, nonGeneric)
  const [elseBranch] = visit(node.elseBranch, env, nonGeneric)

  unify(typeOf(condition), BooleanType)
  unify(typeOf(ifBranch), typeOf(elseBranch))

  const typedNode = { ...node, condition, ifBranch, elseBranch, exprType: typeOf(ifBranch) }
  return [typedNode, env]
}

function typeOf (node: TypedNode): Type {
  return node.exprType
}

// return an array of types for the given array of typed nodes
function typesOf (typedNodes) {
  return typedNodes.map(node => node.exprType)
}

//
// Hindley-Milner-Damas type checking and inference
//

// Return a new copy of a type expression
// * generic variables duplicated
// * non-generic variables shared
function fresh (type, nonGeneric) {
  const mappings = new Map()

  const f = (t) => {
    const pruned = prune(t)

    if (pruned instanceof TypeVariable) {
      if (isGeneric(pruned, nonGeneric)) {
        if (!mappings.has(pruned)) {
          mappings.set(pruned, new TypeVariable())
        }

        return mappings.get(pruned)
      } else {
        // non-generic
        return pruned
      }
    } else if (pruned instanceof TypeOperator) {
      const freshTypeArgs = pruned.typeArgs.map(f)

      // FIXME find out how to do this with type safety, given type erasure.
      return (pruned.constructor as any).of(pruned.name, freshTypeArgs)
    }
  }

  return f(type)
}

// attempt to unify all elements of `list` to the same type
function unifyAll (typeList) {
  prune(typeList[0]) // ???
  typeList.forEach((type, i) => {
    if (i > 0) {
      unify(type, typeList[i - 1])
    }
  })
}

// makes type1 and exprType the same, or throws
// if one side is a variable, set a's instance to be b (variable or operator)
function unify (type1: Type, exprType: Type): void {
  const a = prune(type1)
  const b = prune(exprType)

  if (a instanceof TypeVariable) {
    if (a !== b) {
      if (occursInType(a, b)) {
        throw new PeachError('Type error: recursive unification')
      } else {
        a.instance = b
      }
    }
  } else if (a instanceof TypeOperator && b instanceof TypeVariable) {
    unify(b, a)
  } else if (a instanceof TypeOperator && b instanceof TypeOperator) {
    if (a.name !== b.name || a.typeArgs.length !== b.typeArgs.length) {
      throw new PeachError('Type error: type mismatch')
    }

    a.typeArgs.forEach((argA, i) => {
      unify(argA, b.typeArgs[i])
    })
  }
}

// Return the instance that currently defines the type t
// for a type variable, that's the most deeply nested `instance`.
// for a type operator it's t itself.
// Always returns a TypeOperator or an unbound TypeVariable.
function prune (t: Type): Type {
  if (t instanceof TypeVariable) {
    if (t.instance != null) {
      t.instance = prune(t.instance)
      return t.instance
    }
  }

  return t
}

// Returns true if `type` does not occur in `nonGeneric`
function isGeneric (typeVar, nonGeneric) {
  return !occursIn(typeVar, nonGeneric)
}

// Return true if typeVar appears in any of types
// types: Set
function occursIn (typeVar, types) {
  return [...types].some(type => occursInType(typeVar, type))
}

// Returns true if the pruned `typeVar` occurs in the type expression `type`.
function occursInType (typeVar, type) {
  const prunedType = prune(type)
  if (typeVar === prunedType) {
    return true
  } else if (prunedType instanceof TypeOperator) {
    return occursIn(typeVar, prunedType.typeArgs)
  }

  return false
}
