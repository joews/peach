"use strict";
const fs = require("fs");
const peg = require("pegjs");

// TODO cache the compiled parser
const parserSource = fs.readFileSync("./peach.pegjs", "utf8");
const parser = peg.generate(parserSource);

module.exports = function parse(source) {
  return parser.parse(source);
}
