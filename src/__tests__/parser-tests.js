/* eslint-env jest */
const parse = require('../parser')
const { fixture } = require('./helpers')

//
// snapshot tests for the parser
//

function testFixture (fixtureName) {
  test(fixtureName, () => {
    expect(parse(fixture(fixtureName))).toMatchSnapshot()
  })
}

function testParse (peachCode) {
  test(peachCode, () => {
    expect(parse(peachCode)).toMatchSnapshot()
  })
}

testFixture('fibonacci.peach')
testFixture('str.peach')
testFixture('tail-recursion.peach')

testParse('(true => 1)')
testParse('([true|tail] => 1)')
