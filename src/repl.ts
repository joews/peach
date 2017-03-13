import { start } from 'repl'

// FIXME no Recoverable on REPL typing, raise PR
const { Recoverable } = require('repl')
// /FIXME

import { getRootEnv, getTypeEnv, RuntimeEnv, TypeEnv } from './env'
import interpret from './interpreter'
import typeCheck from './type-checker'
import { Value } from './node-types'
import { parse, PeachError } from '.'

const { version } = require('../package.json')

export default function startRepl (options: any, onExit: (status: Number) => void): void {
  console.log(`🍑  peach v${version}`)

  // remember the environment from each command to pass to the next
  // remember a separate environment for type checking, because the REPL
  // needs to continually type check the new input against existing definitions
  let lastEnv: RuntimeEnv = getRootEnv()
  let lastTypeEnv: TypeEnv = getTypeEnv(lastEnv)

  function evalPeach (source: string, context: any, filename: string, callback: any) {
    try {
      const ast = parse(source)

      const [typed, nextTypeEnv] = typeCheck(ast, lastTypeEnv)
      const [result, nextEnv] = interpret(typed, lastEnv)

      lastEnv = nextEnv
      lastTypeEnv = nextTypeEnv

      const typedResult = `${result}: ${typed.type}`
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

function isRecoverableError (e: Error) {
  return e.message.endsWith('but end of input found.')
}

function getErrorMessage (e: Error): string | Error {
  // A runtime error (which will one day be impossible!) in a Peach program
  if (e instanceof PeachError) {
    return `❗  ${e.message}`
  } else {
    // Any other type of error is a bug in the runtime. I want to see the stack trace.
    console.error(`Uh oh! peach had a problem 💥`)
    return e
  }
}

function getOutput (value: Value): string {
  return value ? value.toString() : value
}
