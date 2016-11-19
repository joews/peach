/* eslint-env jest */
const fs = require('fs')
const path = require('path')

const parse = require('../parser')
const typeCheck = require('../type-checker')
const interpret = require('../interpreter')

function fixture (fileName) {
  const filePath = path.join(__dirname, 'fixtures', fileName)
  return fs.readFileSync(filePath, 'utf8')
}

function run (program) {
  const rootEnv = interpret.getRootEnv()
  const rootTypeEnv = typeCheck.getTypeEnv(rootEnv)

  const ast = parse(program)
  typeCheck(ast, rootTypeEnv)

  return interpret(ast, rootEnv)
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
