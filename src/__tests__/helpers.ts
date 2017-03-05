/* eslint-env jest */
import { readFileSync } from 'fs'
import { join } from 'path'

import { getRootEnv, getTypeEnv } from '../env'
import parse from '../parser'
import typeCheck from '../type-checker'
import interpret from '../interpreter'

export function fixture (fileName) {
  const filePath = join(__dirname, 'fixtures', fileName)
  return readFileSync(filePath, 'utf8')
}

export function run (program) {
  const env = getRootEnv()
  const typeEnv = getTypeEnv(env)

  const ast = parse(program)
  const [typed] = typeCheck(ast, typeEnv)
  return interpret(typed, getRootEnv())
}

export function testResult (program, expectedOutput) {
  test(program, () => {
    expect(run(program)[0]).toEqual(expectedOutput)
  })
}
