import { readFileSync } from 'fs'
import { join } from 'path'
import { generate } from 'pegjs'
import { Ast } from './node-types'

const parserSource = readFileSync(join(__dirname, 'peach.pegjs'), 'utf8')
const parser = generate(parserSource)

export default function parse (source: string): Ast {
  const ast = parser.parse(source)
  // console.log(JSON.stringify(ast))
  return ast
}
