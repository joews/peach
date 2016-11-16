const repl = require('repl')

const { version } = require('../package.json')
const { parse, interpret, typeCheck, PeachError } = require('..')

module.exports = function startRepl (options, onExit) {
  console.log(`🍑  peach v${version}`)

  // remember the environment from each command to pass to the next
  // TODO unify the type check and interpreter environments
  let lastEnv
  let lastTypeEnv = {}

  function evalPeach (src, context, filename, callback) {
    try {
      const ast = parse(src)

      // temp optional typecheck until everything is finished; then it becomes mandatory
      let type
      if (options['type-check']) {
        const checked = typeCheck(ast, lastTypeEnv)
        const lastResult = checked[checked.length - 1]
        type = lastResult[0]
        lastTypeEnv = lastResult[1]
      }

      const [result, env] = interpret(ast, lastEnv)
      lastEnv = env

      const typedResult = type
        ? `${result}: ${type}`
        : result

      return callback(null, typedResult)
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
  // A runtime error (which will one day be impossible!) in a Peach program
  if (e instanceof PeachError) {
    return `❗  ${e.message}`
  } else {
    // Any other type of error is a bug in the runtime. I want to see the stack trace.
    console.error(`Uh oh! peach had a problem 💥`)
    return e
  }
}

function getOutput (value) {
  return value ? value.toString() : value
}
