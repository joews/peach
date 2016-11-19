const parse = require('./src/parser')
const interpret = require('./src/interpreter')
const typeCheck = require('./src/type-checker')
const { PeachError } = require('./src/errors')

module.exports = {
  parse,
  interpret,
  typeCheck,
  PeachError
}
