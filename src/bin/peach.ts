#!/usr/bin/env node
import { readFileSync } from 'fs'
import { resolve } from 'path'

// TODO I don't understand the minimist type definition yet
const parseArgs = require('minimist')

import { parse } from '..'
import startRepl from '../repl'
import { getRootEnv, getTypeEnv } from '../env'
import interpret from '../interpreter'
import typeCheck from '../type-checker'

function readArgs (inputArgs: string[]) {
  const argv = parseArgs(inputArgs)
  const inputPath = argv._[0] || null
  return Object.assign({ inputPath }, argv)
}

function read (filePath: string) {
  return readFileSync(filePath, 'utf8')
}

function runScript (filePath: string) {
  try {
    const ast = parse(read(filePath))
    const env = getRootEnv()
    const typeEnv = getTypeEnv(env)

    const [typedAst] = typeCheck(ast, typeEnv)
    interpret(typedAst, env)
    return 0
  } catch (e) {
    if (/ENOENT/.test(e.message)) {
      console.error(`Could not open the file ${filePath}`)
      return 1
    } else {
      console.error(e.message)
      return 2
    }
  }
}

function runPath (args: any, done: OnComplete) {
  const scriptPath = resolve(args.inputPath)
  const status = runScript(scriptPath)

  return done(status)
}

function repl (args: any, done: OnComplete) {
  startRepl(args, () => done(0))
}

function run (args: any, onComplete: OnComplete) {
  if (args.inputPath == null) {
    repl(args, onComplete)
  } else {
    runPath(args, onComplete)
  }
}

type OnComplete = (status: number) => void

const args = readArgs(process.argv.slice(2))
run(args, status => process.exit(status))
