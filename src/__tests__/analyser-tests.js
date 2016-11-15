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
testAnalyse("`the`")

// def
testAnalyse(`(def x 1) (def y true) x y`)
testAnalyse("(def x `arf`) x")

// lambda
testAnalyse(`(a => 1)`)

// list
testAnalyse(`'(1 2 3)`)
testFails(`'(1 2 false)`)

// destructured aguments
// TODO
// testAnalyse(`(1|list) => list`)

// if
// * TODO branches must cover all possibilities
testAnalyse(`(? true 1 false 2)`)

// branches evaluate to different types
testFails(`(? true 1 false \`two\`)`)

// non-boolean condition
testFails(`(? 1 1 false 2)`)

// test with some pre-defined types and symbols
// use the same types as Rob Smallshire's python implementation for a sanity test

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

testAnalyse(`true => 1`)
testAnalyse(`true`)
