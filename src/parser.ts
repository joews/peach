import { readFileSync } from 'fs'
import  { join } from 'path'
import { generate } from 'pegjs'

const parserSource = readFileSync(join(__dirname, 'peach.pegjs'), 'utf8')
const parser = generate(parserSource)

export default function parse (source) {
  const ast = parser.parse(source)
  // console.log(JSON.stringify(ast))
  return ast
}
