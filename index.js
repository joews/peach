const parse = require('./src/parser')
const interpret = require('./src/interpreter')
const typeCheck = require('./src/type-checker')
const stdlib = require('./src/stdlib')
const { PeachError } = require('./src/errors')

module.exports = {
  parse,
  interpret,
  typeCheck,
  stdlib,
  PeachError
}
