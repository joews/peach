const { create, extend } = require('./util')
const { PeachError } = require('./errors')
const {
  TypeVariable,
  TypeOperator,
  ListType,
  NumberType,
  StringType,
  BooleanType,
  makeFunctionType
} = require('./types')

module.exports = function analyse (rawAst, typeEnv, nonGeneric = new Set()) {
  return visitAll(rawAst, typeEnv, nonGeneric)
}

// Given an environment that maps names to values, return an environment that maps names to types
// FIXME unify the two types of environment, remove this hack.
function getTypeEnv (valueEnv) {
  return Object.keys(valueEnv).reduce((env, name) => {
    if (valueEnv[name].typeFix) {
      env[name] = typed(valueEnv[name], valueEnv[name].typeFix)
    }
    return env
  }, {})
}

module.exports.getTypeEnv = getTypeEnv

// Visit each of `nodes` in order, returning the result
// and environment of the last node.
// returns [typedNode, env]
function visitAll (nodes, env, nonGeneric) {
  return nodes.map(node => visit(node, env, nonGeneric))
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

  List (node, env, nonGeneric) {
    const typedValues = node.values.map((value) => visit(value, env, nonGeneric)[0])

    // FIXME the syntax for an empty list in arguments is (), unquoted. This is confusing.
    // TODO find out the interpreter doesn't have this issue. Because it deals with destructuring
    //  weirdly, I guess. TODO make the code path cleaner - is an empty list like this really
    // a DestructuredList? I think so.
    if (node.isQuoted || typedValues.length === 0) {
      // lists are homogenous: all items must have the same type
      const types = typedValues.map(value => value.exprType)
      unifyAll(types)

      const listType = new ListType(types[0])
      return [typed(node, listType), env]
    } else {
      // a non-quoted list is a function call
      const [fn, ...args] = typedValues
      const returnType = callFunction(fn, args)

      return [typed(node, returnType), env]
    }
  },

  DestructuredList (node, env, nonGeneric) {
    const { head, tail } = node

    const boundHeadType = new TypeVariable()
    const boundTailType = new ListType(new TypeVariable())

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

    // the tail must be a list of the head type
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
        // if it's a destructured list we need to recursively define any named children,
        // so visiting the node will define its names.
        if (argNode.type === 'Name') {
          const argType = new TypeVariable()
          env[argNode.name] = typed(argNode, argType)
          nonGeneric.add(argType)
        }

        const [typedArgNode] = visit(argNode, env, nonGeneric)
        return typeOf(typedArgNode)
      })

      const [bodyNode] = visit(clauseNode.body, env, nonGeneric)
      const returnType = prune(typeOf(bodyNode))

      const clauseType = makeFunctionType(patternTypes, returnType)
      return typed(clauseNode, clauseType)
    })

    // all clauses must have tbe same type
    unifyAll(typesOf(clauses))
    return [typed(node, typeOf(clauses[0])), parentEnv]
  },

  If (node, env, nonGeneric) {
    const { clauses } = node
    const testTypes = clauses.map(([test]) => {
      const [typed] = visit(test, env, nonGeneric)
      return typeOf(typed)
    })

    const branchTypes = clauses.map(([, branch]) => {
      const [typed] = visit(branch, env, nonGeneric)
      return typeOf(typed)
    })

    // every test must be a boolean
    unifyAll([BooleanType, ...testTypes])

    // every branch must have the same type
    unifyAll(branchTypes)

    // if we succeeded, the we can use the type of any branch as the type of the if expression
    return [typed(node, branchTypes[0]), env]
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

// return the type of a function call
function callFunction (fn, args) {
  const returnType = new TypeVariable()
  const callFunctionType = makeFunctionType(typesOf(args), returnType)

  unify(callFunctionType, typeOf(fn))
  return returnType
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
      return pruned.constructor.of(pruned.name, freshTypeArgs)
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
function prune (t, x = false) {
  if (t instanceof TypeVariable) {
    if (t.instance != null) {
      t.instance = prune(t.instance, 1)
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
