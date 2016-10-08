'use strict'
const fs = require('fs')
const path = require('path')
const peg = require('pegjs')

const parserSource = fs.readFileSync(path.join(__dirname, 'peach.pegjs'), 'utf8')
const parser = peg.generate(parserSource)

module.exports = function parse (source) {
  return parser.parse(source)
}
