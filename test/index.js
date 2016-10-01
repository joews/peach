"use strict"
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const parse = require("../src/parser");
const interpret = require("../src/interpreter");

function test(src, expected) {
  // require("chalkline").green();
  const ast = parse(src);
  // console.log(JSON.stringify(ast, null, 2));

  // require("chalkline").blue();
  const [result, env] = interpret(ast);

  // require("chalkline").red();
  // console.log(env);
  console.log(result);

  if (expected != void 0) {
    assert.deepStrictEqual(result, expected);
  }

  return result;
}

function fixture(fileName) {
  const filePath = path.join(__dirname, "fixtures", fileName);
  return fs.readFileSync(filePath, "utf8");
}

// setting and getting values
test(`
(def x 2) (def y 5) (* (+ x y) x)
`);

// quoted s-expressions
test(`
(def list '(1 2 3))
`);

// reference error
try {
  test(`(y)`);
} catch (e) {
  console.log(e.message);
}

// currying
test(`
(def plus-one (+ 1))
(def all-plus-one (map plus-one))
(all-plus-one '(9 8 7))
`)

// function definition
test(`
  (def id (id => id))
  (id 2)

  (def double (x => (* x 2)))
  (double 1001)
`)

// if
test(`
(?
  false 3
  true 4
)
`);

// truthiness
test(`(? false 1)`); // falsy
test(`(? 0 1)`); // truthy

// strings - easier to test without JS String literal escapes
const strings = test(fixture("str.peach"));
console.log(strings.join("\n"));

// comments
test(`
; I heard that commenting code is a good thing
;; define x to be 9
(def x 9)
# add one to x
(+ x 2)
###### the program is finished ######
`);

// commas are whitespace
test(`'(1, 2,              ,,,,,,,,, 3)`);

// comparisons
test(`(= 1 1)`, true);
test(`(= 1 0)`, false);
test(`(= 0 false)`, false);
test(`(< 1 0)`, false);
test(`(> 1 0)`, true);
test(`(<=> 1 0)`, 1);
test(`(<=> 1 1)`, 0);
test(`(<=> 0 1)`, -1);


// an actual program!
test(fixture("fibonacci.peach"), [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);
