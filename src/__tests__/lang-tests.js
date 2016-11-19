/* eslint-env jest */
const { testResult, fixture, run } = require('./helpers')
const { PeachError } = require('../errors')

//
// e2e tests for the parser and interpreter
// TODO: assert on a few more tests; organise better
//

// setting and getting values
testResult(`(def x 2) (def y 5) (* (+ x y) x)`, 14)

// quoted s-expressions
testResult(`(def list '(1 2 3))`, [1, 2, 3])

// reference error
test('referencing an undefined variable throws an error', () => {
  expect(() => run(`(y)`)).toThrow(PeachError)
})

// syntax error
// TODO: get this to throw a Peach-specific error
test('unrecognised syntax throws a SyntaxError', () => {
  expect(() => run(`$#"`)).toThrow()
})

// calling built-in functions
testResult(`(+ 2 3)`, 5)

// currying built-in functions
testResult(`
(def plus-one (+ 1))
(def all-plus-one (map plus-one))
(all-plus-one '(9 8 7))
`, [10, 9, 8])

// function definition
testResult(`
  (def id (id => id))
  (id 2)

  (def double (x => (* x 2)))
  (double 1001)
`, 2002)

// parentheses are optional
testResult(`(def f x => 1) (f 0)`, 1)
testResult(`(def f (x => 1)) (f 0)`, 1)
testResult(`(def f (x) => 1) (f 0)`, 1)
testResult(`(def f ((x) => 1)) (f 0)`, 1)

// functions with no args
testResult(`(def f () => 1) (f)`, 1)

// if
testResult(`
(?
  false 3
  true 4
)
`, 4)

// truthiness
testResult(`(? false 1)`, null) // falsy
testResult(`(? 0 1)`, 1) // truthy

// strings - easier to test without JS String literal escapes
test('string escapes', () => {
  run(fixture('str.peach'))
})

// comments
testResult(`
; I heard that commenting code is a good thing
;; define x to be 9
(def x 9)
# add one to x
(+ x 2)
###### the program is finished ######
`, 11)

// commas are whitespace
testResult(`'(1, 2,              ,,,,,,,,, 3)`, [1, 2, 3])

// some actual programs
testResult(fixture('fibonacci.peach'), [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89])

testResult(`
(def fac
  1 => 1
  n => (* n (fac (- n 1)))
)

(fac 4)
`, 24)

// pattern matching
// - variants with and without parentheses around clauses and patterns
testResult(`
(def is-one
  1 => true
  (other) => false)
'((is-one 1), (is-one 2))
`, [true, false])

// currying user functions
testResult(`
(def add ((x y) => (+ x y)))
(def add-two (add 2))
(add-two 5)
`, 7)

// currying user functions repeatedly
testResult(`
(def addx ((x y z) => (+ (+ x y) z)))
(def add-one (addx 1))
(def add-two (add-one 1))
(add-two 4)
`, 6)

// destructuring lists
// TODO repeat argument names should be illegal, except _
testResult(fixture('list-destructure.peach'), [9, 8, 7])

// destructuring with a non-matching head
testResult(`
  (def starts-with-one (1|_) => true _ => false)
  (def a (starts-with-one '(1 2)))
  (def b (starts-with-one '(2 2)))
  '(a b)
`, [true, false])

// destructuring with a non-matching tail
testResult(`
  (def one-second (_|(1|_)) => true _ => false)
  (def a (one-second '(1 1)))
  (def b (one-second '(2 2)))
  '(a b)
`, [true, false])

// mixed regular and destructured arguments
testResult(`
(def first-is
  (n, (h|_)) => (= n h)
)
(def l '(7 8 9))
'((first-is 7 l) (first-is 8 l))
`, [true, false])

// proper tail calls
testResult(fixture('tail-recursion.peach'), Infinity)

// list functions
testResult(`
(def my-sum (fold + 0))
(my-sum '(1 2 3 4))
`, 10)

testResult(`
(def l '(1 2 3 4 5))
(def is-even x => (= 0 (% x 2)))
(filter is-even l)
`, [2, 4])

testResult(`
(def l '(1 2 3 4 5))
(find (x => (> x 2)) l)
`, 3)

testResult(`(cons 1 '(2 3))`, [1, 2, 3])

// Test peach implementions of stdlib functions
// TODO tail recursive!
testResult(`
(def _peach-map
  (_, (), done) => done
  (fn, (head|tail), done) => (_peach-map fn tail (cons (fn head) done)))

(def peach-map
  (fn, list) => (reverse (_peach-map fn list '())))

(peach-map (+ 1) '(1 2 3 4))
`, [2, 3, 4, 5])

testResult(`
(def _peach-filter
  (_, (), done) => done
  (fn, (head|tail), done) => (?
    (fn head) (_peach-filter fn tail (cons head done))
    true (_peach-filter fn tail done)))

(def peach-filter
  (fn, list) => (reverse (_peach-filter fn list '())))

(peach-filter (x => (>= x 2)) '(1 2 3 4))
`, [2, 3, 4])

testResult(`
(def peach-fold
  (_, init, ()) => init
  (fn, init, (head|tail)) =>
    (peach-fold fn (fn init head) tail))

(peach-fold + 0 '(1 2 3 4))
`, 10)

// nested scopes
testResult(`
(def x 1)
(def y 2)
(def f (x, y) => (+  x y))
(+ x (f 3 4))
`, 8)

// closure
testResult(`
(def x 3)
(def y 4)
(def f (a, b) =>
  () => (+ (+ a b) (+ x y))
)
((f 5 6))

`, 18)
