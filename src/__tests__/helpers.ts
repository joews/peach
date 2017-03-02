/* eslint-env jest */
import { readFileSync } from 'fs'
import { join } from 'path'

import parse from '../parser'
import typeCheck, { getTypeEnv } from '../type-checker'
import interpret, { getRootEnv } from '../interpreter'

export function fixture (fileName) {
  const filePath = join(__dirname, 'fixtures', fileName)
  return readFileSync(filePath, 'utf8')
}

export function run (program) {
  const rootEnv = getRootEnv()
  const rootTypeEnv = getTypeEnv(rootEnv)

  const ast = parse(program)
  typeCheck(ast, rootTypeEnv)

  return interpret(ast, rootEnv)
}

export function testResult (program, expectedOutput) {
  test(program, () => {
    expect(run(program)[0]).toEqual(expectedOutput)
  })
}
