// Type definitions used by the type checker
export class Type {
  name: string

  constructor (name: string) {
    this.name = name
  }
}

export class TypeOperator extends Type {
  typeArgs: Array<Type>

  constructor (name: string, typeArgs: Type[] = []) {
    super(name)
    this.typeArgs = typeArgs
  }

  // polymorphic factory
  static of (name: string, typeArgs: Type[]) {
    return new TypeOperator(name, typeArgs)
  }

  toString () {
    return this.name
  }
}

export const NumberType = new TypeOperator('Number')
export const StringType = new TypeOperator('String')
export const BooleanType = new TypeOperator('Boolean')

export class FunctionType extends TypeOperator {
  constructor (argType: Type, returnType: Type) {
    super('->', [argType, returnType])
  }

  static of (name: string, types: Type[]) {
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
    } else if (argType instanceof FunctionType || argType instanceof TypeVariable && argType.instance instanceof FunctionType) {
      argString = `(${argType})`
    } else {
      argString = argType
    }

    return `${argString} -> ${returnType}`
  }
}

export class ArrayType extends TypeOperator {
  constructor (argType: Type) {
    super('Array', [argType])
  }

  static of (name: string, types: Type[]) {
    return new ArrayType(types[0])
  }

  getType () {
    return this.typeArgs[0]
  }

  toString () {
    return `Array<${this.getType()}>`
  }
}

export class TupleType extends TypeOperator {
  constructor (types: Type[]) {
    super('Tuple', types)
  }

  static of (name: string, types: Type[]) {
    return new TupleType(types)
  }

  getType () {
    return this.typeArgs[0]
  }

  toString () {
    return `(${this.typeArgs.join(', ')})`
  }
}

export class TypeVariable extends Type {
  static nextId: number
  static nextName: number

  id: number
  instance: Type

  constructor () {
    super('')
    this.id = TypeVariable.nextId ++
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
export function makeFunctionType (argTypes: Type[], returnType: Type): Type {
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
