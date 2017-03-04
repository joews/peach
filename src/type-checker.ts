import { create, extend } from './util'
import PeachError from './errors'
import {
  TypeVariable,
  TypeOperator,
  ArrayType,
  NumberType,
  StringType,
  BooleanType,
  makeFunctionType
} from './types'

export default function analyse (rawAst, typedEnv, nonGeneric = new Set()) {
  // console.log(rootEnv)
  return visitAll(rawAst, typedEnv, nonGeneric)
}

function visitAll (nodes, env, nonGeneric) {
  return nodes.map(node => visit(node, env, nonGeneric))
}

function visitSerial (nodes, env, nonGeneric) {
  return nodes.reduce(([, nextEnv], nextNode) =>
    visit(nextNode, nextEnv, nonGeneric)
  , [null, env])
}

function visit (node, env, nonGeneric) {
  const visitor = visitors[node.type]
  // console.log(`TRACE ${node.type}`)
  return visitor(node, env, nonGeneric)
}

const visitors = {
  Def (node, env, nonGeneric) {
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

    const [typedNode] = visit(node.value, env, innerNonGeneric)
    unify(typeOf(typedNode), t)

    return [typedNode, env]
  },

  // identifier
  Name (node, env, nonGeneric) {
    if (!(node.name in env)) {
      throw new PeachError(`${node.name} is not defined`)
    }

    const envType = typeOf(env[node.name])
    const freshType = fresh(envType, nonGeneric)

    return [typed(node, freshType), env]
  },

  Numeral (node, env) {
    return [typed(node, NumberType), env]
  },

  Bool (node, env) {
    return [typed(node, BooleanType), env]
  },

  Str (node, env) {
    return [typed(node, StringType), env]
  },

  Call (node, env, nonGeneric) {
    const [fn] = visit(node.fn, env, nonGeneric)
    const args = node.args.map((arg) => visit(arg, env, nonGeneric)[0])

    const returnType = new TypeVariable()
    const callFunctionType = makeFunctionType(typesOf(args), returnType)

    unify(callFunctionType, typeOf(fn))
    return [typed(node, returnType), env]
  },

  Array (node, env, nonGeneric) {
    let itemType

    if (node.values.length > 0) {
      const typedValues = node.values.map((value) => visit(value, env, nonGeneric)[0])
      const types = typedValues.map(value => value.exprType)

      // arrays are homogenous: all items must have the same type
      unifyAll(types)
      itemType = types[0]
    } else {
      itemType = new TypeVariable()
    }

    const arrayType = new ArrayType(itemType)
    return [typed(node, arrayType), env]
  },

  DestructuredArray (node, env, nonGeneric) {
    const { head, tail } = node

    const boundHeadType = new TypeVariable()
    const boundTailType = new ArrayType(new TypeVariable())

    // TODO immutable env
    if (head.type === 'Name') {
      env[head.name] = typed(head, boundHeadType)
      nonGeneric.add(boundHeadType)
    }

    if (tail.type === 'Name') {
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

    return [typed(node, tailType), env]
  },

  Fn (node, parentEnv, outerNonGeneric) {
    // TODO clauses must be exhaustive - functions must accept any input of the right types
    const clauses = node.clauses.map((clauseNode) => {
      const nonGeneric = new Set([...outerNonGeneric])
      const env = create(parentEnv)

      // get the array of arg types
      const patternTypes = clauseNode.pattern.map(argNode => {
        // If this is a `Name` arg, define it in the function's arguments environment.
        // if it's a destructured array we need to recursively define any named children,
        // so visiting the node will define its names.
        if (argNode.type === 'Name') {
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
    return [typed(node, typeOf(clauses[0])), parentEnv]
  },

  If (node, env, nonGeneric) {
    const [condition] = visit(node.condition, env, nonGeneric)
    const [ifBranch] = visit(node.ifBranch, env, nonGeneric)
    const [elseBranch] = visit(node.elseBranch, env, nonGeneric)

    unify(typeOf(condition), BooleanType)
    unify(typeOf(ifBranch), typeOf(elseBranch))

    return [typed(node, typeOf(ifBranch)), env]
  }
}

function typed (node, type) {
  return extend(node, { exprType: type })
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
      return (<any>pruned.constructor).of(pruned.name, freshTypeArgs)
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
