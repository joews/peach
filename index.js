const parse = require('./src/parser')
const interpret = require('./src/interpreter')
const { PeachError } = require('./src/errors')

module.exports = {
  parse,
  interpret,
  PeachError
}
