/* eslint-env jest */
import parse from '../parser'
import { fixture } from './helpers'

//
// snapshot tests for the parser
//

function testFixture (fixtureName: string) {
  test(fixtureName, () => {
    expect(parse(fixture(fixtureName))).toMatchSnapshot()
  })
}

function testParse (source: string) {
  test(source, () => {
    // console.log(JSON.stringify(parse(source)))
    expect(parse(source)).toMatchSnapshot()
  })
}

// TODO more, better organised grammar tests!
testFixture('fibonacci.peach')
testFixture('str.peach')
testFixture('tail-recursion.peach')

testParse('(true => 1)')
testParse('([true|tail] => 1)')
testParse('((1, 2) => 1)()')

testParse(`[]`)
testParse(`[1,2,3]`)

testParse(`(test)`)
testParse(`test(1)`)
testParse(`(test (1, 2))`)

testParse(`t()`)
testParse(`t(1, 2)`)
testParse(`t(\`1\`, (2), (x) => 3)`)

testParse(`1`)
testParse(`1 * 2/( 2 % 3)`)
testParse(`1 * 2 + 2 - 3`)
testParse(`1 * 2 + (bob - [3])`)
testParse(`2 * (1 + a < b) < 3`)
testParse('a = `two`')
testParse(`a = b < 2`)
testParse(`a == 2`)
testParse(`a == b <=> true`)

testParse(`a.b`)
testParse(`a.b.c`)
testParse(`a[b][0]`)
testParse(`a.b[0]`)

testParse(`a()`)
testParse(`a(b)`)
testParse(`a(b)(c)`)

testParse(`a => 1`)
testParse(`(a) => 1`)
testParse(`(a, b) => {
  1
  2
}`)

testParse(`(a, b) => {
  1
  2
}, (c, d) => true`)

testParse(`
a =
  (1) => a,
  (1) => 2
`)

testParse(`if (a) 1 else 2`)
testParse(`a < if (a) 1 else 2`)
testParse(`()`)
testParse(`(1,)`)
testParse(`(1,2)`)
testParse(`(1, 2, 3,)`)
testParse(`(1, (1 + 2, ((3,),)), (), (2), (3,))`)
testParse(`((((()))))`)
