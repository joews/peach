"use strict";
const fs = require("fs");
const path = require("path");
const peg = require("pegjs");

// TODO cache the compiled parser
const parserPath = path.join(__dirname, "peach.pegjs");

const parserSource = fs.readFileSync(parserPath, "utf8");
const parser = peg.generate(parserSource);

module.exports = function parse(source) {
  return parser.parse(source);
}
