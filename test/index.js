'use strict'
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const parse = require('../src/parser')
const interpret = require('../src/interpreter')

function test (src, expected) {
  // require("chalkline").green();
  const ast = parse(src)
  // console.log(JSON.stringify(ast, null, 2));

  // require("chalkline").blue();
  // eslint-disable-next-line
  const [result, env] = interpret(ast)

  // require("chalkline").red();
  // console.log(env);
  console.log(result)

  if (expected !== void 0) {
    assert.deepStrictEqual(result, expected)
  }

  return result
}

function fixture (fileName) {
  const filePath = path.join(__dirname, 'fixtures', fileName)
  return fs.readFileSync(filePath, 'utf8')
}

// setting and getting values
test(`(def x 2) (def y 5) (* (+ x y) x)`, 14)

// quoted s-expressions
test(`(def list '(1 2 3))`, [1, 2, 3])

// reference error
try {
  test(`(y)`)
} catch (e) {
  console.log(e.message)
}

// calling built-in functions
test(`(+ 2 3)`, 5)

// currying built-in functions
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

// // parentheses are optional
test(`(def f x => 1) (f 0)`)
test(`(def f (x => 1)) (f 0)`, 1)
test(`(def f (x) => 1) (f 0)`, 1)
test(`(def f ((x) => 1)) (f 0)`, 1)

// functions with no args
test(`(def f () => 1) (f)`, 1)

// if
test(`
(?
  false 3
  true 4
)
`)

// truthiness
test(`(? false 1)`) // falsy
test(`(? 0 1)`) // truthy

// strings - easier to test without JS String literal escapes
const strings = test(fixture('str.peach'))
console.log(strings.join('\n'))

// comments
test(`
; I heard that commenting code is a good thing
;; define x to be 9
(def x 9)
# add one to x
(+ x 2)
###### the program is finished ######
`)

// commas are whitespace
test(`'(1, 2,              ,,,,,,,,, 3)`)

// comparisons
test(`(= 1 1)`, true)
test(`(= 1 0)`, false)
test(`(= 0 false)`, false)
test(`(< 1 0)`, false)
test(`(> 1 0)`, true)
test(`(<=> 1 0)`, 1)
test(`(<=> 1 1)`, 0)
test(`(<=> 0 1)`, -1)

// an actual program!
test(fixture('fibonacci.peach'), [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89])

test(`
(def fac
  1 => 1
  n => (* n (fac (- n 1)))
)

(fac 4)
`, 24)

// pattern matching
// - variants with and without parentheses around clauses and patterns
test(`
(def is-one
  1 => \`one\`
  other => (str \`not one: \` other))
(is-one 1)
`, 'one')

test(`
(def is-one (
  (1) => \`one\`
  (other) => (str \`not one: \` other)))
(is-one 2)
`, 'not one: 2')

test(`
(def incr
  n => (incr n 1)
  (n x) => (+ n x))
(def a (incr 5))  ; 6
(def b (incr 5 5))  ; 10
(incr a b)
`, 16)

// currying user functions
test(`
(def add ((x y) => (+ x y)))
(def add-two (add 2))
(add-two 5)
`, 7)

// currying user functions repeatedly
test(`
(def addx ((x y z) => (+ (+ x y) z)))
(def add-one (addx 1))
(def add-two (add-one 1))
(add-two 4)
`, 6)

// currying variadic user functions - the shortest pattern is used to
// decide which clause is used for currying.
test(`
(def f (
  (a b) => \`two\`
  (a b c) => \`three\`))
(def g (f 1))
'((g 1) (g 1 2) (f 1 2) (f 1 2 4))
`, ['two', 'three', 'two', 'three'])

// destructuring lists
// TODO repeat argument names should be illegal, except _
test(`
  (def first (h|t) => h)
  (def second (_|(h|t)) => h)
  (def third (_|(_|(h|t))) => h)
  (def l '(9 8 7))
  '((first l), (second l), (third l))
`, [9, 8, 7])

// destructuring with a non-matching head
test(`
  (def starts-with-one (1|_) => true _ => false)
  (def a (starts-with-one '(1 2)))
  (def b (starts-with-one '(2 2)))
  '(a b)
`, [true, false])

// destructuring with a non-matching tail
test(`
  (def one-second (_|(1|_)) => true _ => false)
  (def a (one-second '(1 1)))
  (def b (one-second '(2 2)))
  '(a b)
`, [true, false])
