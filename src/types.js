// Type definitions used by the type checker
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

class ArrayType extends TypeOperator {
  constructor (argType) {
    super('Array', [argType])
  }

  static of (name, types) {
    return new ArrayType(types[0])
  }

  getType () {
    return this.typeArgs[0]
  }

  toString () {
    return `Array<${this.getType()}>`
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

// Factory for curried function types that take any number of arguments
function makeFunctionType (argTypes, returnType) {
  const [firstArgType, ...tailArgTypes] = argTypes

  if (tailArgTypes.length === 0) {
    return new FunctionType(firstArgType, returnType)
  } else {
    return new FunctionType(firstArgType, makeFunctionType(tailArgTypes, returnType))
  }
}

// TODO
// > Contextual names for TypeVariables, so that many tests in the same
//   JS process can start type variables at A
// > Make nice names for type variables once we have created a lot. E.g. after Z,
//   go to AA.
TypeVariable.nextId = 0
TypeVariable.nextName = 65

module.exports = {
  TypeVariable,
  TypeOperator,
  FunctionType,
  ArrayType,
  NumberType,
  StringType,
  BooleanType,
  makeFunctionType
}
