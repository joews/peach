/* eslint-env jest */
const fs = require('fs')
const path = require('path')

const parse = require('../parser')
const interpret = require('../interpreter')

function fixture (fileName) {
  const filePath = path.join(__dirname, 'fixtures', fileName)
  return fs.readFileSync(filePath, 'utf8')
}

function run (program) {
  return interpret(parse(program))
}

function testResult (program, expectedOutput) {
  test(program, () => {
    expect(run(program)[0]).toEqual(expectedOutput)
  })
}

module.exports = {
  fixture,
  run,
  testResult
}

