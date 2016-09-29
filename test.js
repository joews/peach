const fs = require("fs");
const peg = require("pegjs");

const parserSource = fs.readFileSync("./peach.pegjs", "utf8");
const parser = peg.generate(parserSource);

console.log(parser.parse("(def x 1)"))
