import { makeNativeFunction, applyFunction, PeachFunction } from './function'
import {
  TypeVariable,
  ArrayType,
  NumberType,
  StringType,
  BooleanType,
  makeFunctionType,
  Type
} from './types'

import { Value } from './node-types'

// TODO
// Temporary type aliasas until I implement proper runtime value types
type PNumber = number
type PBoolean = boolean
type PComparable = number | string | boolean

// TODO idiomatic export
export default {
  // operators
  '+': binaryOp('+', (a: PNumber, b: PNumber) => a + b, NumberType, NumberType),
  '-': binaryOp('-', (a: PNumber, b: PNumber) => a - b, NumberType, NumberType),
  '*': binaryOp('*', (a: PNumber, b: PNumber) => a * b, NumberType, NumberType),
  '/': binaryOp('/', (a: PNumber, b: PNumber) => a / b, NumberType, NumberType),
  '%': binaryOp('%', (a: PNumber, b: PNumber) => a % b, NumberType, NumberType),

  // TODO "comparable" type
  '>': binaryOp('>', (a: PNumber, b: PNumber) => a > b, NumberType, BooleanType),
  '>=': binaryOp('>=', (a: PNumber, b: PNumber) => a >= b, NumberType, BooleanType),
  '<': binaryOp('<', (a: PNumber, b: PNumber) => a < b, NumberType, BooleanType),
  '<=': binaryOp('<=', (a: PNumber, b: PNumber) => a <= b, NumberType, BooleanType),
  '==': binaryOp('==', (a: PNumber, b: PNumber) => a === b, anyType(), BooleanType),

  '!': makeNativeFunction('!', (a: PBoolean) => !a, [BooleanType], BooleanType),
  '&&': binaryOp('&&', (a: PBoolean, b: PBoolean) => a && b, BooleanType, BooleanType),
  '||': binaryOp('||', (a: PBoolean, b: PBoolean) => a || b, BooleanType, BooleanType),

  // TODO comparable tpye
  '<=>': binaryOp('<=>', (a: PComparable, b: PComparable) => {
    if (a > b) { return 1 }
    if (a < b) { return -1 }
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
  str: makeNativeFunction('str', (x: any) => '' + x, [anyType], StringType),

  // utils
  print: makeNativeFunction('print', (x: any) => (console.log(x), '' + x), [anyType], StringType)
}

function binaryOp (name: string, fn: (a: any, b: any) => any, argType: Type, returnType: Type) {
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

// Because Peach Arrays are just JavaScript arrays for now, we can proxy certain
// method directly to the runtime value.
function proxyArrayMethod (name: string) {
  const method: any = Array.prototype[name as any]
  return (pFunction: PeachFunction, list: any[]) =>
    method.call(list, (e: any) => applyFunction(pFunction, [e]))
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
  const fn = (list: any[]) => list.reverse()

  return makeNativeFunction('reverse', fn, [inputArrayType], returnType)
}

// (A -> B -> B) -> B -> List<A> -> B
function fold () {
  const itemType = anyType()
  const returnType = anyType()
  const iterateeType = makeFunctionType([itemType, returnType], returnType)

  const fn = (pFunction: PeachFunction, init: Value, list: Value[]) =>
    list.reduce((e, a) =>
      applyFunction(pFunction, [e, a]), init)

  return makeNativeFunction('fold', fn, [iterateeType, returnType, arrayType(itemType)], returnType)
}

// A -> List<A> -> List<A>
function cons () {
  const headType = anyType()
  const tailType = arrayType(headType)
  const fn = (item: Value, list: Value[]) => [item, ...list]

  return makeNativeFunction('cons', fn, [headType, ArrayType], tailType)
}
