/* eslint-env jest */
const parse = require('../parser')
const analyse = require('../analyser')
const { fixture } = require('./helpers')

//
// snapshot tests for the parser
//

function testAnalyse (fixtureName) {
  // assert that the no-op analyser makes no changes
  test(fixtureName, () => {
    const parsed = parse(fixture(fixtureName))
    const analysed = analyse(parsed)

    expect(analysed).not.toBe(parsed)
    expect(analysed).toEqual(parsed)
  })
};

testAnalyse('fibonacci.peach')
testAnalyse('function.peach')
testAnalyse('str.peach')
testAnalyse('tail-recursion.peach')
testAnalyse('list-destructure.peach')
