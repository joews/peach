/* eslint-env jest */
import { testResult, fixture, run } from './helpers'
import PeachError from '../errors'

//
// e2e tests for the parser and interpreter
// TODO: assert on a few more tests; organise better
//

// setting and getting values
testResult(`
  x = 2
  y = 5
  (x + y) * x
`, 14)

// arrays
testResult(`array = [1, 2, 3]`, [1, 2, 3])

// reference error
test('referencing an undefined variable throws an error', () => {
  expect(() => run(`(y)`)).toThrowError(PeachError)
})

// syntax error
// TODO: get this to throw a Peach-specific error
test('unrecognised syntax throws a SyntaxError', () => {
  expect(() => run(`$#"`)).toThrow()
})

// calling built-in functions
testResult(`cons(1, [2])`, [1, 2])

// currying built-in functions
testResult(`
unshiftOne = cons(1)
unshiftOne([2])
`, [1, 2])

// calling a built-in binary operator
testResult(`1 + 2`, 3)

// using a binary operator as a function
testResult(`+(1, 2)`, 3)
testResult(`fold(+, 0, [1, 2, 3])`, 6)
testResult(`
double = *(2)
map(double, [1,2,3])
`, [2, 4, 6])

// function definition
testResult(`
  double = x => x * 2
  double(1001)
`, 2002)

// parentheses are optional
testResult(`
  f = (x) => 1
  f(0)
`, 1)

testResult(`
  f = (x => 1)
  f(0)
`, 1)

testResult(`
  f = ((x) => 1)
  f(0)
`, 1)

// functions with no args
testResult(`
  f = () => 1
  f()
`, 1)

// if
testResult(`if (false) 3 else 4`, 4)
testResult(`
x = 14
if (x < 10)
  \`S\`
else if (x < 20)
  \`M\`
else
  \`L\`
`, `M`)

// strings - easier to test without JS String literal escapes
test('string escapes', () => {
  run(fixture('str.peach'))
})

// comments
testResult(`
# I heard that commenting code is a good thing
## define x to be 9
x = 9
# add one to x
x + 2
###### the program is finished ######
`, 11)

// some actual programs
testResult(fixture('fibonacci.peach'), [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89])

testResult(`
fac =
  (1) => 1,
  (n) => n * fac(n - 1)

fac(4)
`, 24)

// pattern matching
testResult(`
isOne =
  (1) => true,
  (other) => false
[isOne(1), isOne(2)]
`, [true, false])

// currying user functions
testResult(`
add = (x, y) => x + y
add-two = add(2)
add-two(5)
`, 7)

// currying user functions repeatedly
testResult(`
addx = (w, x, y, z) => w + x + y + z
add-one = addx(1)
add-two = add-one(1)
add-three = add-two(1)
add-three(4)
`, 7)

// destructuring arrays
// TODO repeat argument names should be illegal, except _
testResult(fixture('array-destructure.peach'), [9, 8, 7])

// destructuring with a non-matching head
testResult(`
  starts-with-one = [1|_] => true, _ => false
  a = starts-with-one([1, 2])
  b = starts-with-one([2, 2])
  [a, b]
`, [true, false])

// destructuring with a non-matching tail
testResult(`
  one-second = [_|[1|_]] => true, _ => false
  a = one-second([1, 1])
  b = one-second([2, 2])
  [a, b]
`, [true, false])

// mixed regular and destructured arguments
testResult(`
first-is = (n, [h|_]) => n == h
l = [7, 8, 9]
[first-is(7, l), first-is(8, l)]
`, [true, false])

// proper tail calls
testResult(fixture('tail-recursion.peach'), Infinity)

// array functions
testResult(`
sum = fold(+, 0)
sum([1, 2, 3, 4])
`, 10)

testResult(`
l = [1, 2, 3, 4, 5]
is-even = x => x % 2 == 0
filter(is-even, l)
`, [2, 4])

testResult(`
find(x => x > 2, [1, 2, 3, 4, 5])
`, 3)

testResult(`cons(1, [2, 3])`, [1, 2, 3])

// Test peach implementions of stdlib functions
testResult(`
_peach-map =
  (_, [], done) => done,
  (fn, [head|tail], done) => _peach-map(fn, tail, cons(fn(head), done))

peach-map =
  (fn, list) => reverse(_peach-map(fn, list, []))

peach-map(+(1), [1, 2, 3, 4])
`, [2, 3, 4, 5])

testResult(`
_peach-filter =
  (_, [], done) => done,
  (fn, [head|tail], done) =>
    if (fn(head))
      _peach-filter(fn, tail, cons(head, done))
    else
      _peach-filter(fn, tail, done)

peach-filter =
  (fn, list) => reverse(_peach-filter(fn, list, []))

peach-filter((x => (x >= 2)), [1, 2, 3, 4])
`, [2, 3, 4])

testResult(`
peach-fold =
  (_, init, []) => init,
  (fn, init, [head|tail]) =>
    peach-fold(fn, fn(init, head), tail)

peach-fold(+, 0, [1, 2, 3, 4])
`, 10)

// nested scopes
testResult(`
x = 1
y = 2
f = (x, y) => x + y
x + f(3, 4)
`, 8)

// closure
testResult(`
x = 3
y = 4
f = (a, b) =>
  () => a + b + x + y
f(5, 6)()
`, 18)

// Functions with multi-expression bodies
testResult(`
f =
  (1) => 2,
  (x) => {
    y = 3
    print(y)
    y + x
  }
f(2)
`, 5)

// Inner expressions are applied in series, so they can use defs
// from earlier in the same block
testResult(`
f = a => {
  g = b => 10
  c = g(a)
  a + c
}
f(2)
`, 12)

// Inner defs have nested scopes
testResult(`
a = 1
f = a => {
  g = b => {
    a = 3
    a + b
  }
  [a, g(a)]
}
[[a], f(2)]
`, [[1], [2, 5]])

// Tuples
testResult(`(1, 2)`, [1, 2])
testResult(`()`, [])
testResult('((), (`hi`, 1))', [[], [`hi`, 1]])

// Member access
testResult('(`a`,`b`)[1]', `b`)
testResult(`[1,2,3][0]`, 1)
testResult(`[1,2,3][3]`, undefined)
testResult(`
x = 1
[1, 2, 3][x]
`, 2)

test('accessing a tuple by dynamic index is not allowed', () => {
  expect(() => run(`
    x = 1
    (1, 2, 3)[x]
  `)).toThrowError(PeachError)
})
