import { start } from 'repl'

// FIXME no Recoverable on REPL typing, raise PR
const { Recoverable } = require('repl')
// /FIXME

import { getRootEnv } from './env'
import interpret from "./interpreter"
import typeCheck from "./type-checker"
import { parse, PeachError } from '.'

const { version } = require('../package.json')

export default function startRepl (options, onExit) {
  console.log(`🍑  peach v${version}`)

  const rootEnv =  getRootEnv()
  const typeEnv = getRootEnv()

  // remember the environment from each command to pass to the next
  let lastEnv = rootEnv
  // let lastTypeEnv = getTypedEnv(rootEnv)
  let lastTypeEnv = typeEnv

  function evalPeach (src, context, filename, callback) {
    try {
      const ast = parse(src)

      const checked = typeCheck(ast, lastTypeEnv)
      const [typed, nextTypeEnv] = checked[checked.length - 1]
      console.log(typed)
      const [result, nextEnv] = interpret(ast, lastEnv)
      lastEnv = nextEnv
      lastTypeEnv = nextTypeEnv

      const typedResult = `${result}: ${typed.exprType}`
      return callback(null, typedResult)
    } catch (e) {
      if (isRecoverableError(e)) {
        return callback(new Recoverable(e))
      } else {
        return callback(getErrorMessage(e))
      }
    }
  }

  const server = start({
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
  // return value ? value.toString() : value
  return JSON.stringify(value)
}
