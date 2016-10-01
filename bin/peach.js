#! /usr/bin/env node
"use strict";
const fs = require("fs")
const path = require("path");

const { parse, interpret } = require("./../index.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function run(path) {
  try {
    interpret(parse(read(path)));
    return 0;
  } catch (e) {
    if (/ENOENT/.test(e.message)) {
      console.error(`Could not open the file ${path}`);
      return 1;
    } else {
      console.error(e.message);
      return 2;
    }
  }
}

const pathArg = process.argv[2];
if (pathArg == null) {
  console.error(`Usage: peach path/to/script.peach`);
  process.exit(1);
}

const scriptPath = path.resolve(process.argv[2]);
const status = run(scriptPath);

process.exit(status);


