const { makeNativeFunction, applyFunction } = require('./function')
const {
  TypeVariable,
  ListType,
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
  '=': binaryOp('=', (a, b) => a === b, anyType(), BooleanType),

  // TODO more boolean operators
  '!': makeNativeFunction('!', a => !a, [BooleanType], BooleanType),

  '<=>': binaryOp('<=>', (a, b) => {
    if (a > b) return 1
    if (a < b) return -1
    return 0
  }, NumberType, BooleanType),

  // lists
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

// Factory for a list that contains items of the given type
function listType (itemType = anyType()) {
  return new ListType(itemType)
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
  const inputListType = listType()
  const itemType = inputListType.getType()
  const returnType = inputListType
  const iterateeType = makeFunctionType([itemType], itemType)
  const fn = proxyArrayMethod('map')

  return makeNativeFunction('map', fn, [iterateeType, inputListType], returnType)
}

// (A -> Boolean) -> List<A> -> List<A>
function filter () {
  const inputListType = listType()
  const itemType = inputListType.getType()
  const returnType = inputListType
  const iterateeType = makeFunctionType([itemType], BooleanType)
  const fn = proxyArrayMethod('filter')

  return makeNativeFunction('filter', fn, [iterateeType, inputListType], returnType)
}

// TODO Maybe
// (A -> Boolean) -> List<A> -> A
function find () {
  const inputListType = listType()
  const itemType = inputListType.getType()
  const returnType = itemType
  const iterateeType = makeFunctionType([itemType], BooleanType)
  const fn = proxyArrayMethod('find')

  return makeNativeFunction('find', fn, [iterateeType, inputListType], returnType)
}

// List<A> -> List<A>
function reverse () {
  const inputListType = listType()
  const returnType = inputListType
  const fn = (list) => list.reverse()

  return makeNativeFunction('reverse', fn, [inputListType], returnType)
}

// (A -> B -> B) -> B -> List<A> -> B
function fold () {
  const itemType = anyType()
  const returnType = anyType()
  const iterateeType = makeFunctionType([itemType, returnType], returnType)

  const fn = (pFunction, init, list) =>
    list.reduce((e, a) =>
      applyFunction(pFunction, [e, a]), init)

  return makeNativeFunction('fold', fn, [iterateeType, returnType, listType(itemType)], returnType)
}

// A -> List<A> -> List<A>
function cons () {
  const headType = anyType()
  const tailType = listType(headType)
  const fn = (item, list) => [item, ...list]

  return makeNativeFunction('cons', fn, [headType, listType], tailType)
}
