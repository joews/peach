const { makeNativeFunction, applyFunction } = require('./function')
const {
  TypeVariable,
  ArrayType,
  NumberType,
  StringType,
  BooleanType,
  makeFunctionType
} = require('./types')

module.exports = {
  // operators
  '+': binaryOp('+', (a, b) => a + b, NumberType, NumberType),
  '-': binaryOp('-', (a, b) => a - b, NumberType, NumberType),
  '*': binaryOp('*', (a, b) => a * b, NumberType, NumberType),
  '/': binaryOp('/', (a, b) => a / b, NumberType, NumberType),
  '%': binaryOp('%', (a, b) => a % b, NumberType, NumberType),

  // TODO "comparable" type
  '>': binaryOp('>', (a, b) => a > b, NumberType, BooleanType),
  '>=': binaryOp('>=', (a, b) => a >= b, NumberType, BooleanType),
  '<': binaryOp('<', (a, b) => a < b, NumberType, BooleanType),
  '<=': binaryOp('<=', (a, b) => a <= b, NumberType, BooleanType),
  '==': binaryOp('==', (a, b) => a === b, anyType(), BooleanType),

  '!': makeNativeFunction('!', a => !a, [BooleanType], BooleanType),
  '&&': binaryOp('&&', (a, b) => a && b, BooleanType, BooleanType),
  '||': binaryOp('||', (a, b) => a || b, BooleanType, BooleanType),

  '<=>': binaryOp('<=>', (a, b) => {
    if (a > b) return 1
    if (a < b) return -1
    return 0
  }, NumberType, BooleanType),

  // arrays
  map: map(),
  filter: filter(),
  find: find(),
  reverse: reverse(),
  cons: cons(),
  fold: fold(),

  // type conversion
  str: makeNativeFunction('str', (x) => '' + x, [anyType], StringType),

  // utils
  print: makeNativeFunction('print', (x) => '' + x, [anyType], StringType)
}

function binaryOp (name, fn, argType, returnType) {
  return makeNativeFunction(name, fn, [argType, argType], returnType)
}

// Factory for a new type variable
function anyType () {
  return new TypeVariable()
}

// Factory for a array that contains items of the given type
function arrayType (itemType = anyType()) {
  return new ArrayType(itemType)
}

// Utility
function proxyArrayMethod (name) {
  return (pFunction, list) => list[name](e => applyFunction(pFunction, [e]))
}

//
// Factories for built-in array functions
//

// (A -> A) -> List<A> -> List<A>
function map () {
  const inputArrayType = arrayType()
  const itemType = inputArrayType.getType()
  const returnType = inputArrayType
  const iterateeType = makeFunctionType([itemType], itemType)
  const fn = proxyArrayMethod('map')

  return makeNativeFunction('map', fn, [iterateeType, inputArrayType], returnType)
}

// (A -> Boolean) -> List<A> -> List<A>
function filter () {
  const inputArrayType = arrayType()
  const itemType = inputArrayType.getType()
  const returnType = inputArrayType
  const iterateeType = makeFunctionType([itemType], BooleanType)
  const fn = proxyArrayMethod('filter')

  return makeNativeFunction('filter', fn, [iterateeType, inputArrayType], returnType)
}

// TODO Maybe
// (A -> Boolean) -> List<A> -> A
function find () {
  const inputArrayType = arrayType()
  const itemType = inputArrayType.getType()
  const returnType = itemType
  const iterateeType = makeFunctionType([itemType], BooleanType)
  const fn = proxyArrayMethod('find')

  return makeNativeFunction('find', fn, [iterateeType, inputArrayType], returnType)
}

// List<A> -> List<A>
function reverse () {
  const inputArrayType = arrayType()
  const returnType = inputArrayType
  const fn = (list) => list.reverse()

  return makeNativeFunction('reverse', fn, [inputArrayType], returnType)
}

// (A -> B -> B) -> B -> List<A> -> B
function fold () {
  const itemType = anyType()
  const returnType = anyType()
  const iterateeType = makeFunctionType([itemType, returnType], returnType)

  const fn = (pFunction, init, list) =>
    list.reduce((e, a) =>
      applyFunction(pFunction, [e, a]), init)

  return makeNativeFunction('fold', fn, [iterateeType, returnType, arrayType(itemType)], returnType)
}

// A -> List<A> -> List<A>
function cons () {
  const headType = anyType()
  const tailType = arrayType(headType)
  const fn = (item, list) => [item, ...list]

  return makeNativeFunction('cons', fn, [headType, ArrayType], tailType)
}
