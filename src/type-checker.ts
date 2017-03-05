import { create, extend, last } from './util'
import PeachError from './errors'
import { TypeEnv } from './env'

import {
  Ast, AstNode, TypedNode, AstProgramNode, AstDefNode, AstNameNode,
  AstNumeralNode, AstBooleanNode, AstStringNode, AstCallNode, AstArrayNode,
  AstDestructuredArrayNode, AstFunctionNode, AstIfNode,
  isAstNameNode
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

export default function analyse (ast: Ast, typedEnv: TypeEnv): TypeCheckResult<Ast> {
  // TODO the cast is needed because of the visitor lookup by Ast Node type. It could
  // be avoided by refactoring AstNodes to classes and using `if (node instanceof AstXyzNode)`
  // guards, or `isAstAyzNode` function guards.
  return visit(ast, typedEnv, new Set<Type>()) as TypeCheckResult<Ast>
}

export type TypeCheckResult<T extends AstNode> = [TypedNode<T>, TypeEnv]
type TypeCheckVisitor<T extends AstNode> = (node: T, env: TypeEnv, nonGeneric: Set<Type>) => TypeCheckResult<T>

// Visit a list of Nodes, returning the typed node and environment of the last Node.
function visitSerial (nodes: AstNode[], env: TypeEnv, nonGeneric: Set<Type>): TypeCheckResult<AstNode> {
  const initialState: TypeCheckResult<AstNode> = [null, env]

  return nodes.reduce(([, nextEnv], nextNode) =>
    visit(nextNode, nextEnv, nonGeneric)
  , initialState)
}

function visitAll (nodes, rootEnv, nonGeneric) {
  return nodes.reduce(([nodes, env], node) => {
    const [outNode, outEnv] = visit(node, env, nonGeneric)
    return [[...nodes, outNode], outEnv]
  }, [[], rootEnv])
}

function visit (node: AstNode, env: TypeEnv, nonGeneric: Set<Type>) {
  const visitor = visitors[node.type]
  return visitor(node, env, nonGeneric)
}

const visitors: { [nodeType: string]: TypeCheckVisitor<AstNode> } = {
  Program (node: AstProgramNode, env, nonGeneric) {
    const [expressions, finalEnv] = visitAll(node.expressions, env, nonGeneric)
    const programType = typeOf(last(expressions))

    const typedNode = typed({ ...node, expressions }, programType)
    return [typedNode, finalEnv]
  },

  Def (node: AstDefNode, env, nonGeneric) {
    if (env.hasOwnProperty(node.name)) {
      throw new PeachError(`${node.name} has already been defined`)
    }

    // allow for recursive binding by binding ahead of evaluating the child
    // analogous to Lisp's letrec, but in the enclosing scope.
    // TODO immutable env
    const t = new TypeVariable()
    env[node.name] = typed(node, t)

    // if we are defining a function, mark the new identifier as
    //  non-generic inside the evaluation of the body.
    const innerNonGeneric = (node.value.type === 'Fn')
      ? new Set([...nonGeneric, t])
      : nonGeneric

    const [value] = visit(node.value, env, innerNonGeneric)
    unify(typeOf(value), t)

    const typedNode = typed({ ...node, value }, t)
    return [typedNode, env]
  },

  // identifier
  Name (node: AstNameNode, env, nonGeneric) {
    if (!(node.name in env)) {
      throw new PeachError(`${node.name} is not defined`)
    }

    const envType = typeOf(env[node.name])
    const freshType = fresh(envType, nonGeneric)

    return [typed(node, freshType), env]
  },

  Numeral (node: AstNumeralNode, env) {
    return [typed(node, NumberType), env]
  },

  Bool (node: AstBooleanNode, env) {
    return [typed(node, BooleanType), env]
  },

  Str (node: AstStringNode, env) {
    return [typed(node, StringType), env]
  },

  Call (node: AstCallNode, env, nonGeneric) {
    const [fn] = visit(node.fn, env, nonGeneric)
    const args = node.args.map((arg) => visit(arg, env, nonGeneric)[0])

    const returnType = new TypeVariable()
    const callFunctionType = makeFunctionType(typesOf(args), returnType)

    unify(callFunctionType, typeOf(fn))

    const typedNode = typed({ ...node, args }, returnType)
    return [typedNode, env]
  },

  Array (node: AstArrayNode, env, nonGeneric) {
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
    const typedNode = typed({ ...node, values: typedValues }, arrayType)

    return [typedNode, env]
  },

  DestructuredArray (node: AstDestructuredArrayNode, env, nonGeneric) {
    const { head, tail } = node

    const boundHeadType = new TypeVariable()
    const boundTailType = new ArrayType(new TypeVariable())

    // TODO immutable env
    if (isAstNameNode(head)) {
      env[head.name] = typed(head, boundHeadType)
      nonGeneric.add(boundHeadType)
    }

    if (isAstNameNode(tail)) {
      env[tail.name] = typed(tail, boundTailType)
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

    const typedNode = typed({ ...node, head: typedHead, tail: typedTail }, tailType)
    return [typed(node, tailType), env]
  },

  Fn (node: AstFunctionNode, parentEnv, outerNonGeneric) {
    // TODO clauses must be exhaustive - functions must accept any input of the right types
    const clauses = node.clauses.map((clauseNode) => {
      const nonGeneric = new Set([...outerNonGeneric])
      const env = create(parentEnv)

      // get the array of arg types
      const patternTypes = clauseNode.pattern.map(argNode => {
        // If this is a `Name` arg, define it in the function's arguments environment.
        // if it's a destructured array we need to recursively define any named children,
        // so visiting the node will define its names.
        if (isAstNameNode(argNode)) {
          const argType = new TypeVariable()
          env[argNode.name] = typed(argNode, argType)
          nonGeneric.add(argType)
        }

        const [typedArgNode] = visit(argNode, env, nonGeneric)
        return typeOf(typedArgNode)
      })

      const [lastBodyNode] = visitSerial(clauseNode.body, env, nonGeneric)
      const returnType = prune(typeOf(lastBodyNode))

      const clauseType = makeFunctionType(patternTypes, returnType)
      return typed(clauseNode, clauseType)
    })

    // all clauses must have tbe same type
    unifyAll(typesOf(clauses))

    const typedNode = typed({ ...node, clauses }, typeOf(clauses[0]))
    return [typedNode, parentEnv]
  },

  If (node: AstIfNode, env, nonGeneric) {
    const [condition] = visit(node.condition, env, nonGeneric)
    const [ifBranch] = visit(node.ifBranch, env, nonGeneric)
    const [elseBranch] = visit(node.elseBranch, env, nonGeneric)

    unify(typeOf(condition), BooleanType)
    unify(typeOf(ifBranch), typeOf(elseBranch))

    const typedNode = typed({ ...node, condition, ifBranch, elseBranch }, typeOf(ifBranch))
    return [typedNode, env]
  }
}

function typed<T extends AstNode> (node: T, type: Type): TypedNode<T> {
  return Object.assign({}, node, { exprType: type })
}

function typeOf (node) {
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
function unify (type1, exprType) {
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
function prune (t) {
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
