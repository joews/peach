#! /usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')

const { parse, interpret } = require('../index.js')
const startRepl = require('../src/repl.js')

function read (filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function runScript (path) {
  try {
    interpret(parse(read(path)))
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

function runPath (pathArg, done) {
  console.log(pathArg)
  const scriptPath = path.resolve(process.argv[2])
  const status = runScript(scriptPath)

  return done(status)
}

function repl (done) {
  startRepl(() => done(0))
}

function run (pathArg, onComplete) {
  if (pathArg == null) {
    repl(onComplete)
  } else {
    runPath(pathArg, onComplete)
  }
}

const pathArg = process.argv[2]
run(pathArg, (status) => process.exit(status))

