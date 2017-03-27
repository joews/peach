import { create, extend, last } from './util'
import PeachError from './errors'
import { TypeEnv } from './env'

import {
  Ast, AstNode, AstProgramNode, AstDefNode, AstIdentifierNode,
  AstNumberNode, AstBooleanNode, AstStringNode, AstCallNode, AstArrayNode,
  AstDestructuredArrayNode, AstFunctionNode, AstIfNode, AstTupleNode, AstMemberNode,
  AstBinaryOperatorNode,
  TypedAst, TypedNode, TypedProgramNode, TypedDefNode, TypedIdentifierNode,
  TypedNumberNode, TypedBooleanNode, TypedStringNode, TypedCallNode, TypedArrayNode,
  TypedDestructuredArrayNode, TypedFunctionNode, TypedFunctionClauseNode, TypedIfNode,
  TypedTupleNode, TypedMemberNode, TypedBinaryOperatorNode,
  TypedDefPreValueNode
} from './node-types'

import {
  Type,
  TypeVariable,
  TypeOperator,
  ArrayType,
  NumberType,
  StringType,
  BooleanType,
  TupleType,
  makeFunctionType
} from './types'

export default function analyse (ast: Ast, typedEnv: TypeEnv): TypeCheckResult<TypedAst> {
  return visit(ast, typedEnv, new Set<Type>()) as TypeCheckResult<TypedAst>
}

export type TypeCheckResult<T extends TypedNode> = [T, TypeEnv]
type TypeCheckVisitor<T extends TypedNode> = (node: AstNode, env: TypeEnv, nonGeneric: Set<Type>) => TypeCheckResult<T>

// Visit a list of nodes, each in the returned env of the previous step.
// Return an array of their resolved types and the last environment.
function visitAll (nodes: AstNode[], rootEnv: TypeEnv, nonGeneric: Set<any>): [TypedNode[], TypeEnv] {
  type NodesAndEnv = [TypedNode[], TypeEnv]

  const initialState: NodesAndEnv = [[], rootEnv]

  const reducer = ([nodes, env]: NodesAndEnv, node: AstNode): NodesAndEnv => {
    const [outNode, outEnv] = visit(node, env, nonGeneric)
    const nextNodes = [...nodes, outNode]
    return [nextNodes, outEnv]
  }

  return nodes.reduce(reducer, initialState)
}

function visit (node: AstNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedNode> {
  // console.log(`TRACE typecheck: ${node.kind}\n${JSON.stringify(node)}`)

  switch (node.kind) {
    case 'Program':
      return visitProgram(node, env, nonGeneric)
    case 'Def':
      return visitDef(node, env, nonGeneric)
    case 'Identifier':
      return visitName(node, env, nonGeneric)
    case 'Number':
      return visitNumeral(node, env)
    case 'Boolean':
      return visitBool(node, env)
    case 'String':
      return visitStr(node, env)
    case 'Call':
      return visitCall(node, env, nonGeneric)
    case 'Array':
      return visitArray(node, env, nonGeneric)
    case 'DestructuredArray':
      return visitDestructuredArray(node, env, nonGeneric)
    case 'Function':
      return visitFn(node, env, nonGeneric)
    case 'If':
      return visitIf(node, env, nonGeneric)
    case 'Tuple':
      return visitTuple(node, env, nonGeneric)
    case 'Member':
      return visitMember(node, env, nonGeneric)
    case 'BinaryOperator':
      return visitBinaryOperator(node, env, nonGeneric)
    default:
      throw new Error(`Uncrecognised AST node type: ${node.kind}`)
  }
}

function visitProgram (node: AstProgramNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedProgramNode> {
  const [expressions, finalEnv] = visitAll(node.expressions, env, nonGeneric)
  const programType = typeOf(last(expressions))

  const typedNode = { ...node, expressions, type: programType }
  return [typedNode, finalEnv]
}

function visitDef (node: AstDefNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedDefNode> {
  if (env.hasOwnProperty(node.name)) {
    throw new PeachError(`${node.name} has already been defined`)
  }

  // Allow for recursive binding by binding ahead of evaluating the child
  //  analogous to Lisp's letrec, but in the enclosing scope. We don't know
  //  the value or concrete type yet.
  // The binding must be created before visiting the value (in case the value
  //  is a recursive function). We can't create a TypedEnv value for the def
  //  value without visiting it, so bind a temporary value with a new TypeVariable.
  //  Once the value is visited, unify the placeholder type and the concrete value
  //  type. The TypeEnv only really cares about the type of its values so we can
  //  continue to use the typed stub.
  const t = new TypeVariable()
  const typedStubNode: TypedDefPreValueNode = { kind: 'DefPreValue', type: t }
  env[node.name] = typedStubNode


  // if we are defining a function, mark the new identifier as
  //  non-generic inside the evaluation of the body.
  const innerNonGeneric = (node.value.kind === 'Function')
    ? new Set([...nonGeneric, t])
    : nonGeneric

  const [value] = visit(node.value, env, innerNonGeneric)
  unify(typeOf(value), t)

  const typedNode = { ...node, value, type: t }
  return [typedNode, env]
}

function visitName (node: AstIdentifierNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedIdentifierNode> {
  if (!(node.name in env)) {
    throw new PeachError(`${node.name} is not defined`)
  }

  const envType = typeOf(env[node.name])
  const freshType = fresh(envType, nonGeneric)

  const typedNode = { ...node, type: freshType }
  return [typedNode, env]
}

function visitNumeral (node: AstNumberNode, env: TypeEnv): TypeCheckResult<TypedNumberNode> {
  return [{...node, type: NumberType }, env]
}

function visitBool (node: AstBooleanNode, env: TypeEnv): TypeCheckResult<TypedBooleanNode> {
  return [{ ...node, type: BooleanType }, env]
}

function visitStr (node: AstStringNode, env: TypeEnv): TypeCheckResult<TypedStringNode> {
  return [{ ...node, type: StringType }, env]
}

function visitCall (node: AstCallNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedCallNode> {
  const [fn] = visit(node.fn, env, nonGeneric)
  const args: TypedNode[] = node.args.map((arg) => visit(arg, env, nonGeneric)[0])

  const returnType = new TypeVariable()
  const callFunctionType: Type = makeFunctionType(typesOf(args), returnType)

  unify(callFunctionType, typeOf(fn))

  const typedNode = { ...node, fn: fn as TypedFunctionNode, args, type: returnType }
  return [typedNode, env]
}

function visitArray (node: AstArrayNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedArrayNode> {
  let itemType: Type
  let typedValues: TypedNode[]

  if (node.values.length > 0) {
    typedValues = node.values.map((value) => visit(value, env, nonGeneric)[0])
    const types = typesOf(typedValues)

    // arrays are homogenous: all items must have the same type
    unifyAll(types)
    itemType = types[0]
  } else {
    itemType = new TypeVariable()
    typedValues = []
  }

  const arrayType = new ArrayType(itemType)
  const typedNode = { ...node, values: typedValues, type: arrayType }

  return [typedNode, env]
}

function visitDestructuredArray (node: AstDestructuredArrayNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedDestructuredArrayNode> {
  const { head, tail } = node

  const boundHeadType = new TypeVariable()
  const boundTailType = new ArrayType(new TypeVariable())

  // TODO immutable env
  if (head.kind === 'Identifier') {
    const typedHead: TypedIdentifierNode = { ...head, type: boundHeadType }
    env[head.name] = typedHead
    nonGeneric.add(boundHeadType)
  }

  if (tail.kind === 'Identifier') {
    const typedTail: TypedIdentifierNode = { ...tail, type: boundTailType }
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

  const typedNode = { ...node, head: typedHead, tail: typedTail, type: tailType }
  return [typedNode, env]
}

function visitFn (node: AstFunctionNode, parentEnv: TypeEnv, outerNonGeneric: Set<Type>): TypeCheckResult<TypedFunctionNode> {
  // TODO clauses must be exhaustive - functions must accept any input of the right types
  const clauses: TypedFunctionClauseNode[] = node.clauses.map((clauseNode) => {
    const nonGeneric = new Set([...outerNonGeneric])
    const env = create(parentEnv)

    // get the array of arg types
    const pattern: TypedNode[] = clauseNode.pattern.map(argNode => {
      // If this is a `Name` arg, define it in the function's arguments environment.
      // if it's a destructured array we need to recursively define any named children,
      // so visiting the node will define its names.
      if (argNode.kind === 'Identifier') {
        const argType = new TypeVariable()
        const typedArgNode: TypedIdentifierNode = { ...argNode, type: argType }

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
    return { ...clauseNode, pattern, body, type: clauseType }
  })

  // all clauses must have tbe same type
  unifyAll(typesOf(clauses))

  const typedNode = { ...node, clauses, type: typeOf(clauses[0])}
  return [typedNode, parentEnv]
}

function visitIf (node: AstIfNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedIfNode> {
  const [condition] = visit(node.condition, env, nonGeneric)
  const [ifBranch] = visit(node.ifBranch, env, nonGeneric)
  const [elseBranch] = visit(node.elseBranch, env, nonGeneric)

  unify(typeOf(condition), BooleanType)
  unify(typeOf(ifBranch), typeOf(elseBranch))

  const typedNode = { ...node, condition, ifBranch, elseBranch, type: typeOf(ifBranch) }
  return [typedNode, env]
}

function visitTuple (node: AstTupleNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedNode> {
  const values = node.values.map(value => visit(value, env, nonGeneric)[0])
  const type = new TupleType(typesOf(values))

  const typedNode = { ...node, values, type }
  return [typedNode, env]
}

function visitMember (node: AstMemberNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedMemberNode> {
  const [typedSource] = visit(node.source, env, nonGeneric)
  const [typedName] = visit(node.name, env, nonGeneric)

  if (typedSource.type instanceof TupleType) {
    // Tuples need a literal index so we can statically check safety
    if (typedName.kind !== 'Number') {
      throw new PeachError(`Type check error: Tuple index must be a literal number. Instead it was ${typedName.kind}.`)
    }

    if (typedName.value >= typedSource.type.getLength()) {
      throw new PeachError(`Type check error: Tuple index out of bounds for ${typedSource.type}.`)
    }

    const typedNode = { ...node, source: typedSource, name: typedName, type: typedSource.type.getTypeAt(typedName.value) }
    return [typedNode, env]

  } else if (typedSource.type instanceof ArrayType) {
    // TODO cleaner pattern for comparing Type objects - should be able to rewrite as tagged unions to match
    // node and value types.
    if (typedName.type.name !== 'Number') {
      throw new PeachError(`Type check error: Array index must be a number. Instead it was ${JSON.stringify(typedName.type)}.`)
    }

    const typedNode = { ...node, source: typedSource, name: typedName, type: typedSource.type.getType() }
    return [typedNode, env]
  } else {
    throw new PeachError(`Type check error: can only access fields of Array and Tuple. Instead it was ${typedSource.type}.`)
  }
}

function visitBinaryOperator (node: AstBinaryOperatorNode, env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<TypedBinaryOperatorNode> {

  const identifierNode: AstIdentifierNode = {
    kind: 'Identifier',
    name: node.operator
  }

  const callNode: AstCallNode = {
    kind: 'Call',
    fn: identifierNode,
    args: [node.left, node.right]
  }

  const [typedLeft] = visit(node.left, env, nonGeneric)
  const [typedRight] = visit(node.right, env, nonGeneric)

  const [typedCallNode] = visitCall(callNode, env, nonGeneric)
  const typedNode = { ...node, left: typedLeft, right: typedRight, type: typeOf(typedCallNode) }
  return [typedNode, env]
}

function typeOf (node: TypedNode): Type {
  return node.type
}

// return an array of types for the given array of typed nodes
function typesOf (typedNodes: TypedNode[]) {
  return typedNodes.map(node => node.type)
}

//
// Hindley-Milner-Damas type checking and inference
//

// Return a new copy of a type expression
// * generic variables duplicated
// * non-generic variables shared
function fresh (type: Type, nonGeneric: Set<Type>) {
  const mappings = new Map()

  const f = (t: Type): Type => {
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
    } else {
      return t
    }
  }

  return f(type)
}

// attempt to unify all elements of `list` to the same type
function unifyAll (typeList: Type[]) {
  prune(typeList[0]) // ???
  typeList.forEach((type, i) => {
    if (i > 0) {
      unify(type, typeList[i - 1])
    }
  })
}

// makes type1 and type the same, or throws
// if one side is a variable, set a's instance to be b (variable or operator)
function unify (type1: Type, type: Type): void {
  const a = prune(type1)
  const b = prune(type)

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
function isGeneric (typeVar: Type, nonGeneric: Set<Type>) {
  return !occursIn(typeVar, nonGeneric)
}

// Return true if typeVar appears in any of types
function occursIn (typeVar: Type, types: Iterable<Type>): boolean {
  return [...types].some(type => occursInType(typeVar, type))
}

// Returns true if the pruned `typeVar` occurs in the type expression `type`.
function occursInType (typeVar: Type, type: Type) {
  const prunedType = prune(type)
  if (typeVar === prunedType) {
    return true
  } else if (prunedType instanceof TypeOperator) {
    return occursIn(typeVar, prunedType.typeArgs)
  }

  return false
}
