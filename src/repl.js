const repl = require('repl')

const { version } = require('../package.json')
const { parse, interpret, typeCheck, PeachError } = require('..')

module.exports = function startRepl (options, onExit) {
  console.log(`🍑  peach v${version}`)

  const rootEnv = interpret.getRootEnv()
  const rootTypeEnv = typeCheck.getTypeEnv(rootEnv)

  // remember the environment from each command to pass to the next
  // TODO unify the type check and interpreter environments
  let lastEnv = rootEnv
  let lastTypeEnv = rootTypeEnv

  function evalPeach (src, context, filename, callback) {
    try {
      const ast = parse(src)

      const checked = typeCheck(ast, lastTypeEnv)
      const [typed, typeEnv] = checked[checked.length - 1]
      lastTypeEnv = typeEnv

      const [result, env] = interpret(ast, lastEnv)
      lastEnv = env

      const typedResult = `${result}: ${typed.exprType}`
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
  // return JSON.stringify(value)
}
