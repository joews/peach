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
    expect(parse(source)).toMatchSnapshot()
  })
}

testFixture('fibonacci.peach')
testFixture('str.peach')
testFixture('tail-recursion.peach')

testParse('(true => 1)')
testParse('([true|tail] => 1)')
