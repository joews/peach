function PeachError (message) {
  this.name = 'PeachError'
  this.message = message
}

PeachError.prototype = new Error()

module.exports = {
  PeachError
}
