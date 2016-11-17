const { create } = require('./util')
const { PeachError } = require('./errors')

module.exports = function analyse (rawAst, rootEnv, nonGeneric = new Set()) {
  return visitAll(rawAst, rootEnv, nonGeneric)
}

// Visit each of `nodes` in order, returning the result
// and environment of the last node.
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
    env[node.name] = t

    // if we are defining a function, mark the new identifier as
    //  non-generic inside the evaluation of the body. This is important
    //  for typechecking recursion.
    const innerNonGeneric = (node.value.type === 'Fn')
      ? new Set([...nonGeneric, t])
      : nonGeneric

    const [type] = visit(node.value, env, innerNonGeneric)
    unify(type, t)

    return [type, env]
  },

  // identifier
  Name (node, env, nonGeneric) {
    if (!(node.name in env)) {
      throw new PeachError(`${node.name} is not defined`)
    }

    const type = fresh(env[node.name], nonGeneric)
    return [type, env]
  },

  Numeral (node, env) {
    return [NumberType, env]
  },

  Bool (node, env) {
    return [BooleanType, env]
  },

  Str (node, env) {
    return [StringType, env]
  },

  List (node, env, nonGeneric) {
    if (node.isQuoted) {
      const types = node.values.map((value) => visit(value, env, nonGeneric)[0])
      unifyAll(types)
      return [new ListType(types[0]), env]
    } else {
      const [fn, arg] = node.values
      return call(fn, arg, env, nonGeneric)
    }
  },

  DestructuredList (node, env, nonGeneric) {
    // FIXME
    throw new PeachError(`TypeError: Peach can't type destructured arguments yet. Coming soon!`)

    // const { head, tail } = node

    // // TODO immutable env
    // if (head.type === 'Name') {
    //   env[head.name] = new TypeVariable()
    //   nonGeneric.add(env[head.name])
    // }

    // if (tail.type === 'Name') {
    //   env[tail.name] = new TypeVariable()
    //   nonGeneric.add(env[tail.name])
    // }

    // const [headType] = visit(head, env, nonGeneric)
    // const [tailType] = visit(tail, env, nonGeneric)

    // // head and tail must have the same type
    // // TODO THIS IS WRONG! tailType should be a list<headType>
    // unify(headType, tailType)

    // return [headType, env]
  },

  Fn (node, parentEnv, outerNonGeneric) {
    const clauses = node.clauses.map((clause) => {
      const nonGeneric = new Set([...outerNonGeneric])
      const env = create(parentEnv)

      // FIXME the type checker doesn't understand >1-ary functions yet
      if (clause.pattern.length > 1) {
        throw new PeachError(`TypeError: Peach can't type functions with arity != 1 yet. Coming soon!`)
      }

      // get the array of arg types
      const patternTypes = clause.pattern.map(arg => {
        // If this is a `Name` arg, define it in the function's arguments environment.
        // if it's a destructured list we need to recursively define any named children,
        // so visiting the node will define its names.
        if (arg.type === 'Name') {
          const argType = new TypeVariable()
          env[arg.name] = argType
          nonGeneric.add(argType)
        }

        return visit(arg, env, nonGeneric)[0]
      })

      const returnType = prune(visit(clause.body, env, nonGeneric)[0])

      // FIXME use the single allowed pattern type for now
      return new FunctionType(patternTypes[0], returnType)
    })

    // all clauses must have tbe same type
    // FIXME not finding a bug here
    unifyAll(clauses)
    return [clauses[0], parentEnv]
  },

  If (node, env, nonGeneric) {
    const { clauses } = node
    const testTypes = clauses.map(clause => visit(clause[0], env, nonGeneric)[0])
    const branchTypes = clauses.map(clause => visit(clause[1], env, nonGeneric)[0])

    // every test must be a boolean
    unifyAll([BooleanType, ...testTypes])

    // every branch must have the same type
    unifyAll(branchTypes)

    // if we succeeded, the we can use the type of any branch as the type of the if expression
    return [branchTypes[0], env]
  }
}

function call (fn, arg, env, nonGeneric) {
  const [fnType] = visit(fn, env, nonGeneric)
  const [argType] = visit(arg, env, nonGeneric)

  const returnType = new TypeVariable()
  const callFnType = new FunctionType(argType, returnType)

  unify(callFnType, fnType)
  return [returnType, env]
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

// makes type1 and type2 the same, or throws
// if one side is a variable, set a's instance to be b (variable or operator)
function unify (type1, type2) {
  const a = prune(type1)
  const b = prune(type2)

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

// I don't really like classes but they are a good fit here (factory + intanceof bundled)

class TypeOperator {
  constructor (name, typeArgs = []) {
    this.name = name
    this.typeArgs = typeArgs
  }

  // polymorphic factory
  static of (name, typeArgs) {
    return new TypeOperator(name, typeArgs)
  }

  toString () {
    return this.name
  }
}

const NumberType = new TypeOperator('Number')
const StringType = new TypeOperator('String')
const BooleanType = new TypeOperator('Boolean')

class FunctionType extends TypeOperator {
  constructor (argType, returnType) {
    super('->', [argType, returnType])
  }

  static of (name, types) {
    const [argType, returnType] = types
    return new FunctionType(argType, returnType)
  }

  // getArgTypes () {
  //   return this.typeArgs.slice(0, -1)
  // }

  getArgType () {
    return this.typeArgs[0]
  }

  getReturnType () {
    return this.typeArgs[1]
  }

  toString () {
    const argType = this.getArgType()
    const returnType = this.getReturnType()

    let argString
    if (argType == null) {
      argString = '()'
    } else if (argType instanceof FunctionType || argType.instance instanceof FunctionType) {
      argString = `(${argType})`
    } else {
      argString = argType
    }

    return `${argString} -> ${returnType}`
  }
}

class ListType extends TypeOperator {
  constructor (argType) {
    super('List', [argType])
  }

  static of (name, types) {
    return new ListType(types[0])
  }

  getType () {
    return this.typeArgs[0]
  }

  toString () {
    return `List<${this.getType()}>`
  }
}

class TypeVariable {
  constructor () {
    this.id = TypeVariable.nextId ++
    this.name = null
  }

  toString () {
    if (this.instance) {
      return this.instance.toString()
    } else {
      if (!this.name) {
        this.name = String.fromCharCode(TypeVariable.nextName ++)
      }

      return this.name
    }
  }
}

TypeVariable.nextId = 0
TypeVariable.nextName = 65

// TODO
Object.assign(module.exports, {
  TypeVariable,
  TypeOperator,
  FunctionType,
  ListType,
  NumberType,
  StringType,
  BooleanType
})
