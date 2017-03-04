#!/usr/bin/env node
import { readFileSync } from 'fs'
import { resolve } from 'path'

// TODO I don't understand the minimist type definition yet
const parseArgs = require('minimist')

import { parse } from '..'
import startRepl from '../repl'
import { getRootEnv } from '../env'
import interpret from "../interpreter"
import typeCheck from "../type-checker"

function readArgs (inputArgs) {
  const argv = parseArgs(inputArgs)
  const inputPath = argv._[0] || null
  return Object.assign({ inputPath }, argv)
}

function read (filePath) {
  return readFileSync(filePath, 'utf8')
}

function runScript (path) {
  try {
    const ast = parse(read(path))
    const env = getRootEnv()

    typeCheck(ast, env)
    interpret(ast, env)
    return 0
  } catch (e) {
    if (/ENOENT/.test(e.message)) {
      console.error(`Could not open the file ${path}`)
      return 1
    } else {
      console.error(e.message)
      return 2
    }
  }
}

function runPath (args, done) {
  const scriptPath = resolve(args.inputPath)
  const status = runScript(scriptPath)

  return done(status)
}

function repl (args, done) {
  startRepl(args, () => done(0))
}

function run (args, onComplete) {
  if (args.inputPath == null) {
    repl(args, onComplete)
  } else {
    runPath(args, onComplete)
  }
}

const args = readArgs(process.argv.slice(2))
run(args, (status) => process.exit(status))
