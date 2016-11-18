/* eslint-env jest */
const parse = require('../parser')
const analyse = require('../analyser')
const { fixture } = require('./helpers')

// TODO expose the types in a cleaner way
const {
  TypeVariable,
  TypeOperator,
  FunctionType,
  ListType,
  NumberType,
  StringType,
  BooleanType
} = analyse

//
// snapshot tests for the parser
//

function testAnalyse (code, env = {}) {
  test(code, () => {
    const parsed = parse(code)
    const analysed = analyse(parsed, env)

    const types = analysed.map(e => e[0].toString())

    expect(types).toMatchSnapshot()
  })
};

function testFails (code, env = {}) {
  test(code, () => {
    const parsed = parse(code)
    expect(() => analyse(parsed, env)).toThrowErrorMatchingSnapshot()
  })
}

function testFixture (fixtureName) {
  // assert that the no-op analyser makes no changes
  test(fixtureName, () => {
    const parsed = parse(fixture(fixtureName))
    const analysed = analyse(parsed, {})
    expect(analysed).toMatchSnapshot()
  })
};

// TODO type built-in functions so we can test fixtures
// testFixture('fibonacci.peach')
// testFixture('function.peach')
testFixture('str.peach')
// testFixture('tail-recursion.peach')
// testFixture('list-destructure.peach')

// literals
testAnalyse(`1`)
testAnalyse(`true`)
testAnalyse('`the`')

// def
testAnalyse(`(def x 1) (def y true) x y`)
testAnalyse('(def x `arf`) x')

// lambda
testAnalyse(`(a => 1)`)

// list
testAnalyse(`'(1 2 3)`)
testFails(`'(1 2 false)`)

// if
// * TODO branches must cover all possibilities
testAnalyse(`(? true 1 false 2)`)

// branches evaluate to different types
testFails(`(? true 1 false \`two\`)`)

// non-boolean condition
testFails(`(? 1 1 false 2)`)

// test with some pre-defined types and symbols
// run adapted version of Rob Smallshire's python implementation for a sanity test:
// http://smallshire.org.uk/sufficientlysmall/2010/04/11/a-hindley-milner-type-inference-implementation-in-python/
// (adapted because Peach doesn't have `let` yet; use `def` and test in the enclosing environment)

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

const A = new TypeVariable()
const B = new TypeVariable()
const AB = new PairType(A, B)

const testEnv = () => ({
  // No unit type yet, so all functions take exactly one argument
  // Number -> Number
  inc: new FunctionType(NumberType, NumberType),

  // Number -> Boolean
  zero: new FunctionType(NumberType, BooleanType),

  add: new FunctionType(NumberType, new FunctionType(NumberType, NumberType)),
  sub: new FunctionType(NumberType, new FunctionType(NumberType, NumberType)),

  // Number -> Number -> Boolean
  addZero: new FunctionType(NumberType, new FunctionType(NumberType, BooleanType)),

  // A -> B -> A*B
  pair: new FunctionType(A, new FunctionType(B, AB))
})

testAnalyse(`inc`, testEnv())
testAnalyse(`(inc 1)`, testEnv())
testAnalyse(`zero`, testEnv())
testAnalyse(`(zero 0)`, testEnv())
testAnalyse(`(addZero 1)`, testEnv())
testAnalyse(`((addZero 1) 2)`, testEnv())

testAnalyse(`(pair 1)`, testEnv())
testAnalyse(`((pair 1) 2)`, testEnv())
testAnalyse(`(def id x => x) (id 3) (id \`hello\`)`, testEnv())

testAnalyse(`
  (def fib
    0 => 1
    1 => 1
    x => ((add (fib ((sub x) 1))) (fib ((sub x) 2))))
`, testEnv())

// type mismatch in recursive call
testFails(`
  (def fibc
    0 => 1
    1 => 1
    x => ((add (fibc true)) (fibc ((sub x) 3))))
`, testEnv())

// type mismatch in patterns
testFails(`0 => 0, true => 1`, testEnv())

// type mismatch in return
testFails(`0 => 0, 1 => true`, testEnv())

// type mismatch in arguments to `x`, because function arguments are non-generic
testFails(`x => ((pair (x 3)) (x true))`, testEnv())

// polymorphic function call
testAnalyse(`
  (def id x => x)
  ((pair (id 3)) (id true))
`, testEnv())

// recursive function arguments can't be unified with no further type information
testFails(`f => (f f)`)

// ...but it's ok when there is more information available
testAnalyse(`
  (def g f => 5)
  (g g)
`)

// // TODO I can't run this test from Rob Smallshire's implementation
// yet because function bodies are a single expression and Peach doesn't have
// `let` yet.
// generic and non-generic variables
// testAnalyse(`
//   (g =>
//     (def f x => g)
//     ((pair (f 3)) (f true))
//   )
// `, testEnv())

// function composition
testAnalyse(`f => g => arg => (g (f arg))`)

// destructured aguments
testAnalyse(`(1|list) => list`)
testAnalyse(`((1|(2|t)) => t)`)
testAnalyse(`((x|(y|t)) => '('(x y) t))`)
testFails(`((1|(true|t)) => t)`)
testFails(`((h|(true|t)) => '('(h 1) t))`)

// curried function calls
testAnalyse(`
  (def list (a, b, c) => '(a b c))
  (list 1)
  (list 1 2)
  (list 1 2 3)
  ((list 1) 2 3)
  (list true false true)
`)

testFails(`
  (def list (a, b, c) => '(a b c))
  (list 1 true)
`)

testAnalyse(`
  (def f
    (1 2) => '(9 9)
    (a b) => '(a b))

  (f 1)
  (f 1 2)
  ((f 1) 2)
  (f 3)
  (f 3 4)
  ((f 3) 4)
`)

// FIXME #6 - extra parens needed to immediately invoke a no-arg function
testAnalyse('((() => `look ma no args`))')
