/* eslint-env jest */
const parse = require('../parser')
const { fixture } = require('./helpers')

//
// snapshot tests for the parser
//

function testParse (fixtureName) {
  test(fixtureName, () => {
    expect(parse(fixture(fixtureName))).toMatchSnapshot()
  })
}

testParse('fibonacci.peach')
testParse('str.peach')
testParse('tail-recursion.peach')
