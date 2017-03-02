// with help from http://stackoverflow.com/a/32749533/2806996
export default class PeachError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    this.message = message

    // captureStackTrace available in v8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(message).stack)
    }
  }
}