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
    console.log(JSON.stringify(parse(source)))
    expect(parse(source)).toMatchSnapshot()
  })
}

// testFixture('fibonacci.peach')
// testFixture('str.peach')
// testFixture('tail-recursion.peach')

// testParse('(true => 1)')
// testParse('([true|tail] => 1)')
// testParse('((1, 2) => 1)')

// testParse(`[]`)
// testParse(`[1,2,3]`)

// testParse(`(test)`)
// testParse(`(test 1)`)
// testParse(`(test 1, 2)`)

// testParse(`t()`)
// testParse(`t(1, 2)`)
// testParse(`t(\`1\`, (2), (x) => 3)`)

// testParse('get(t(`a`), 0)')

// new grammar tests

testParse(`1`)
testParse(`1 * 2/( 2 % 3)`)
testParse(`1 * 2 + 2 - 3`)
testParse(`1 * 2 + (bob - [3])`)
testParse(`2 * (1 + a < b) < 3`)
testParse(`a = 2`)
testParse(`a = b < 2`)
testParse(`a == 2`)
testParse(`a == b <=> 2`)

testParse(`a.b`)
testParse(`a.b.c`)
testParse(`a[b][0]`)
testParse(`a.b[0]`)

testParse(`a()`)
testParse(`a(b)`)
testParse(`a(b)(c)`)
