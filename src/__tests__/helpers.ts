/* eslint-env jest */
import { readFileSync } from 'fs'
import { join } from 'path'

import { getRootEnv } from '../env'
import parse from '../parser'
import typeCheck from '../type-checker'
import interpret from '../interpreter'

export function fixture (fileName) {
  const filePath = join(__dirname, 'fixtures', fileName)
  return readFileSync(filePath, 'utf8')
}

export function run (program) {
  const rootEnv = getRootEnv()
  const ast = parse(program)
  typeCheck(ast, rootEnv)

  return interpret(ast, rootEnv)
}

export function testResult (program, expectedOutput) {
  test(program, () => {
    expect(run(program)[0]).toEqual(expectedOutput)
  })
}
