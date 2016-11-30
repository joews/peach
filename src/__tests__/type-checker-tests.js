/* eslint-env jest */
const parse = require('../parser')
const typeCheck = require('../type-checker')
const { fixture } = require('./helpers')
const { clone } = require('../util')

const {
  TypeVariable,
  TypeOperator,
  FunctionType,
  NumberType,
  BooleanType
} = require('../types')

// TODO unify envs
const rootEnv = require('../interpreter').getRootEnv()
const defaultEnv = () => clone(typeCheck.getTypeEnv(rootEnv))

//
// snapshot tests for the parser
//

function testTypeCheck (code, env = defaultEnv()) {
  test(code, () => {
    const parsed = parse(code)
    const analysed = typeCheck(parsed, env)

    const types = analysed.map(e => e[0].exprType.toString())
    expect(types).toMatchSnapshot()
  })
};

function testFails (code, env = defaultEnv()) {
  test(code, () => {
    const parsed = parse(code)
    expect(() => typeCheck(parsed, env)).toThrowErrorMatchingSnapshot()
  })
}

function testFixture (fixtureName, env = defaultEnv()) {
  // assert that the no-op analyser makes no changes
  test(fixtureName, () => {
    const parsed = parse(fixture(fixtureName))
    const analysed = typeCheck(parsed, env)
    expect(analysed.map(e => e[0].exprType.toString())).toMatchSnapshot()
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
testTypeCheck(`(a => 1)`)

// array
testTypeCheck(`[1 2 3]`)
testFails(`[1 2 false]`)

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

// the peach type checker works over nodes with an `exprType` property.
// helper for creating nodes for synthetic type tests
function typed (type) {
  return {
    exprType: type
  }
}

// simulate a user-defined type
class PairType extends TypeOperator {
  constructor (a, b) {
    super('*', [a, b])
  }

  static of (name, typeArgs) {
    return new PairType(...typeArgs)
  }

  toString () {
    return `[${this.typeArgs.join(this.name)}]`
  }
}

const A = typed(new TypeVariable())
const B = typed(new TypeVariable())
const AB = typed(new PairType(A, B))

const testEnv = () => ({
  // No unit type yet, so all functions take exactly one argument
  // Number -> Number
  inc: typed(new FunctionType(NumberType, NumberType)),

  // // Number -> Boolean
  zero: typed(new FunctionType(NumberType, BooleanType)),

  add: typed(new FunctionType(typed(NumberType), typed(new FunctionType(typed(NumberType), typed(NumberType))))),
  sub: typed(new FunctionType(typed(NumberType), typed(new FunctionType(typed(NumberType), typed(NumberType))))),

  // Number -> Number -> Boolean
  addZero: typed(new FunctionType(typed(NumberType), typed(new FunctionType(typed(NumberType), typed(BooleanType))))),

  // A -> B -> A*B
  pair: typed(new FunctionType(A, typed(new FunctionType(B, AB))))
})

// testTypeCheck(`inc`, testEnv())
testTypeCheck(`(inc 1)`, testEnv())

testTypeCheck(`zero`, testEnv())
testTypeCheck(`(zero 0)`, testEnv())
testTypeCheck(`(addZero 1)`, testEnv())
testTypeCheck(`((addZero 1) 2)`, testEnv())

testTypeCheck(`(pair 1)`, testEnv())
testTypeCheck(`((pair 1) 2)`, testEnv())
testTypeCheck(`
  id = x => x
  (id 3)
  (id \`hello\`)
`, testEnv())

testTypeCheck(`
 fib =
    0 => 1
    1 => 1
    x => ((add (fib ((sub x) 1))) (fib ((sub x) 2)))
`, testEnv())

// type mismatch in recursive call
testFails(`
  fibc =
    0 => 1
    1 => 1
    x => ((add (fibc true)) (fibc ((sub x) 3)))
`, testEnv())

// type mismatch in patterns
testFails(`0 => 0, true => 1`, testEnv())

// type mismatch in return
testFails(`0 => 0, 1 => true`, testEnv())

// type mismatch in arguments to `x`, because function arguments are non-generic
testFails(`x => ((pair (x 3)) (x true))`, testEnv())

// polymorphic function call
testTypeCheck(`
  id = x => x
  ((pair (id 3)) (id true))
`, testEnv())

// recursive function arguments can't be unified with no further type information
testFails(`f => (f f)`)

// ...but it's ok when there is more information available
testTypeCheck(`
  g = f => 5
  (g g)
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
testTypeCheck(`f => g => arg => (g (f arg))`)

// destructured aguments
testTypeCheck(`[1|list] => list`)
testTypeCheck(`([1|[2|t]] => t)`)
testTypeCheck(`([x|[y|t]] => [[x y] t])`)
testFails(`([1|[true|t]] => t)`)
testFails(`([h|[true|t]] => [[h 1] t])`)

// curried function calls
testTypeCheck(`
  list = (a, b, c) => [a b c]
  (list 1)
  (list 1 2)
  (list 1 2 3)
  ((list 1) 2 3)
  (list true false true)
`)

testFails(`
  list = (a, b, c) => [a b c]
  (list 1 true)
`)

testTypeCheck(`
  f =
    (1 2) => [9 9]
    (a b) => [a b]

  (f 1)
  (f 1 2)
  ((f 1) 2)
  (f 3)
  (f 3 4)
  ((f 3) 4)
`)

// FIXME #6 - extra parens needed to immediately invoke a no-arg function
testTypeCheck('((() => `look ma no args`))')
