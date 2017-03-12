/* eslint-env jest */
import { readFileSync } from 'fs'
import { join } from 'path'

import { getRootEnv, getTypeEnv } from '../env'
import parse from '../parser'
import typeCheck from '../type-checker'
import interpret from '../interpreter'

export function fixture (fileName: string) {
  const filePath = join(__dirname, 'fixtures', fileName)
  return readFileSync(filePath, 'utf8')
}

export function run (source: string) {
  const env = getRootEnv()
  const typeEnv = getTypeEnv(env)

  const ast = parse(source)
  const [typed] = typeCheck(ast, typeEnv)
  return interpret(typed, getRootEnv())
}

export function testResult (source: string, expectedOutput: any) {
  test(source, () => {
    expect(run(source)[0]).toEqual(expectedOutput)
  })
}
