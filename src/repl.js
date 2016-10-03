const repl = require('repl')

const { version } = require('../package.json')
const { parse, interpret } = require('../index.js')

module.exports = function startRepl (onExit) {
  console.log(`🍑  peach v${version}`)

  // remember the environment from each command to pass to the next
  let lastEnv

  function evalPeach (src, context, filename, callback) {
    try {
      const [result, env] = interpret(parse(src), lastEnv)
      lastEnv = env
      return callback(null, result)
    } catch (e) {
      if (isRecoverableError(e)) {
        return callback(new repl.Recoverable(e))
      } else {
        return callback(getErrorMessage(e))
      }
    }
  }

  const server = repl.start({
    prompt: '❯ ',
    eval: evalPeach,
    writer: getOutput
  })
  server.on('exit', onExit)
}

function isRecoverableError (e) {
  return e.message.endsWith('but end of input found.')
}

function getErrorMessage (e) {
  // TODO If the message is a PeachError (not a thing yet), log the message.
  // If it's a JS Error, log the stack trace.
  return `Error: ${e.message}`
}

function getOutput (value) {
  return value ? value.toString() : value
}
