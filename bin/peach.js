#! /usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const parseArgs = require('minimist')

const { parse, interpret, typeCheck } = require('../index.js')
const startRepl = require('../src/repl.js')

function readArgs (inputArgs) {
  const argv = parseArgs(inputArgs, {
    boolean: ['type-check'],
    default: {
      'type-check': false
    }
  })

  const inputPath = argv._[0] || null
  return Object.assign({ inputPath }, argv)
}

function read (filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function runScript (path) {
  try {
    const ast = parse(read(path))

    const rootEnv = interpret.getRootEnv()
    const typeEnv = typeCheck.getTypeEnv(rootEnv)

    // TODO integrate type checker when it's finished
    // TODO unify the type and value environments
    if (args['type-check']) {
      typeCheck(ast, typeEnv)
    }

    interpret(ast, rootEnv)
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
  const scriptPath = path.resolve(args.inputPath)
  const status = runScript(scriptPath, args)

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

