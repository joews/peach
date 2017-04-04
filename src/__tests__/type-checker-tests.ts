/* eslint-env jest */
import parse from '../parser'
import typeCheck from '../type-checker'
import { getRootEnv, getTypeEnv } from '../env'
import { fixture } from './helpers'
import { clone } from '../util'
import { Type } from '../types'
import { TypedNode, AstNode } from '../node-types'

import {
  TypeVariable,
  TypeOperator,
  FunctionType,
  NumberType,
  BooleanType,
  TupleType
} from '../types'

function testTypeCheck (source: string, env = getTypeEnv(getRootEnv())) {
  test(source, () => {
    const parsed = parse(source)
    // console.log(JSON.stringify(parsed))
    const [lastNode] = typeCheck(parsed, env)
    const type = lastNode.type.toString()
    // console.log(type)
    expect(type).toMatchSnapshot()
  })
};

function testFails (source: string, env = getTypeEnv(getRootEnv())) {
  test(source, () => {
    const parsed = parse(source)
    // console.log(JSON.stringify(parsed))
    expect(() => typeCheck(parsed, env)).toThrowErrorMatchingSnapshot()
  })
}

function testFixture (fixtureName: string, env = getTypeEnv(getRootEnv())) {
  test(fixtureName, () => {
    const parsed = parse(fixture(fixtureName))
    const [lastNode] = typeCheck(parsed, env)
    const type = lastNode.type.toString()
    expect(type).toMatchSnapshot()
  })
};

testFixture('fibonacci.peach')
testFixture('function.peach')
testFixture('str.peach')
testFixture('tail-recursion.peach')
testFixture('array-destructure.peach')

// literals
testTypeCheck(`1`)
testTypeCheck(`true`)
testTypeCheck('`the`')

// def
testTypeCheck(`
  x = 1
  y = true
  x
  y
`)

testTypeCheck(`
  x = \`arf\`
  x
`)

// lambda
testTypeCheck(`a => 1`)

// array
testTypeCheck(`[1, 2, 3]`)
testFails(`[1, 2, false]`)

// if
testTypeCheck(`if (true) 1 else 2`)

// branches evaluate to different types
testFails(`(if (true) 1 else \`two\`)`)

// non-boolean condition
testFails(`if (1) 1 else 2`)

// test with some pre-defined types and symbols
// run adapted version of Rob Smallshire's python implementation for a sanity test:
// http://smallshire.org.uk/sufficientlysmall/2010/04/11/a-hindley-milner-type-inference-implementation-in-python/
// (adapted because Peach doesn't have `let` yet; use `def` and test in the enclosing environment)

// the peach type checker works over nodes with an `type` property.
// helper for creating nodes for synthetic type tests
function typed (type: Type): TypedNode {
  return {
    type: type,
    kind: 'String',
    value: 'dummy'
  }
}

// simulate a user-defined type
class PairType extends TypeOperator {
  constructor (a: Type, b: Type) {
    super('*', [a, b])
  }

  static of (name: string, [a, b]: Type[]) {
    return new PairType(a, b)
  }

  toString () {
    return `[${this.typeArgs.join(this.name)}]`
  }
}

const A = new TypeVariable()
const B = new TypeVariable()
const AB = new PairType(A, B)

const testEnv = () => ({
  // No unit type yet, so all functions take exactly one argument
  // Number -> Number
  inc: typed(new FunctionType(NumberType, NumberType)),

  // // Number -> Boolean
  zero: typed(new FunctionType(NumberType, BooleanType)),

  add: typed(new FunctionType(NumberType, new FunctionType(NumberType, NumberType))),
  sub: typed(new FunctionType(NumberType, new FunctionType(NumberType, NumberType))),

  // Number -> Number -> Boolean
  addZero: typed(new FunctionType(NumberType, new FunctionType(NumberType, BooleanType))),

  // A -> B -> A*B
  pair: typed(new FunctionType(A, new FunctionType(B, AB)))
})

testTypeCheck(`inc`, testEnv())
testTypeCheck(`inc(1)`, testEnv())

testTypeCheck(`zero`, testEnv())
testTypeCheck(`zero(0)`, testEnv())
testTypeCheck(`addZero(1)`, testEnv())
testTypeCheck(`addZero(1)(2)`, testEnv())

testTypeCheck(`pair(1)`, testEnv())
testTypeCheck(`pair(1)(2)`, testEnv())
testTypeCheck(`
  id = x => x
  id(3)
  id(\`hello\`)
`, testEnv())

testTypeCheck(`
 fib =
    (0) => 1,
    (1) => 1,
    (x) => add(fib(sub(x, 1)), fib(sub(x, 2)))
`, testEnv())

// type mismatch in recursive call
testFails(`
  fibc =
    (0) => 1,
    (1) => 1,
    (x) => add(fib(true), fib(sub(x, 2)))
`, testEnv())

// type mismatch in patterns
testFails(`(0) => 0, (true) => 1`, testEnv())

// type mismatch in return
testFails(`(0) => 0, (1) => true`, testEnv())

// type mismatch in arguments to `x`, because function arguments are non-generic
testFails(`x => pair(x(3))(x(true))`, testEnv())


// polymorphic function call
testTypeCheck(`
  id = x => x
  pair(id(true))(id(false))
  pair(id(1))(id(false))
`, testEnv())

// recursive function arguments can't be unified with no further type information
testFails(`f => f(f)`)

// ...but it's ok when there is more information available
testTypeCheck(`
  g = f => 5
  g(g)
`)

// // TODO I can't run this test from Rob Smallshire's implementation
// yet because function bodies are a single expression and Peach doesn't have
// `let` yet.
// generic and non-generic variables
// testTypeCheck(`
//   (g =>
//     (def f x => g)
//     ((pair (f 3)) (f true))
//   )
// `, testEnv())

// function composition
testTypeCheck(`f => g => arg => g(f(arg))`)

// destructured aguments
testTypeCheck(`[1|list] => list`)
testTypeCheck(`([1|[2|t]] => t)`)
testTypeCheck(`([x|[y|t]] => [[x, y], t])`)
testFails(`([1|[true|t]] => t)`)
testFails(`([h|[true|t]] => [[h, 1], t])`)

// curried function calls
testTypeCheck(`
  list = (a, b, c) => [a, b, c]
  list(1)
  list(1, 2)
  list(1, 2, 3)
  list(1)(2, 3)
  list(true, false, true)
`)

testFails(`
  list = (a, b, c) => [a, b, c]
  list(1, true)
`)

testTypeCheck(`
  f =
    (1, 2) => [9, 9],
    (a, b) => [a, b]

  f(1)
  f(1, 2)
  f(1)(2)
  f(3)
  f(3, 4)
  f(3)(4)
`)

testTypeCheck('(() => `look ma no args`)()')

// Functions with multi expression bodies
// FIXME
testTypeCheck(`
(1) => 0,
(x) =>
  y = 3
  f = (a => 2)
  f(y)
`)

// defs can't use already-bound names
testFails(`
x => {
  x = 3
  x
}`)

// tuples
testTypeCheck(`()`)
testTypeCheck(`(1,)`)
testTypeCheck(`(1, 2)`)

testTypeCheck('(1, ((())))') // FIXME still a problem with more deeply-nested tuples


// member access

// any index of an array may be fetched. All elements have the same type,
// and there is no bounds check
testTypeCheck(`[1,2][0]`)
testTypeCheck(`[1,2][3]`) // TODO Maybe type for array access
testTypeCheck(`
x = 1
[1,2][x]
`)

// tuples have a static number of elements. Only indexoes in that range
// may be fetched. The index must be a Number literal so we can guarantee
// that the element exists.
testTypeCheck(`(1, 2)[0]`)
testTypeCheck('(1, `two`)[1]')
testFails(`(1, 2)[2]`)
testFails(`
x = 1     // WIP ASI type issue!
(1, 2)[x]
`)

// binary operators
testTypeCheck('1 + 2')
testTypeCheck('1 + 2 * 3')
