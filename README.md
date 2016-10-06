# peach

[![Build](https://travis-ci.org/jwhitfieldseed/peach.svg?branch=master)](https://travis-ci.org/jwhitfieldseed/peach)

A cheeky functional language.

```
(def fib
  0 => 1
  1 => 1
  x => (+ (fib (- x 1)) (fib (- x 2))))

(map fib '(0 1 2 3 4 5 6 7 8 9 10))
;; [ 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 ]
```

# Syntax
S-Expressions! Peach is inspired by Clojure and @bodil's [BODOL](https://github.com/bodil/BODOL), which I learned about from [this awesome talk](https://www.youtube.com/watch?v=DHubfS8E--o).

```clojure
# assignment
(def x 2) ; 2

# equality
(= x 2) ; true

# maths and stuff
(* x 2) ; 4

# conditionals
(?
  true "yes"
  false "no"
  _ "wat"
) # "yes"

# functions
(def double (x => (* x 2)))
(map x (x => (pow x 2))) ; [2 4 8 16]

# currying
(def double-all (map double))
(double-all '(1 2 3 4)) ; (2 4 6 8)

# pattern matching
(fn fib
  0 => 1
  1 => 1
  x => (+ (fib x - 2) (fib x - 1))
)

(fn starts-with-one
  (1|_) => true
  _  => false
)

# tail call optimisation
; The first tail recursive peach program
; n: the accumulating factorial
; x: a decrementing iteration count
;;;; factorial : Number -> Number -> Number
(def factorial
  (n, 1) => n
  (n, x) => (factorial (* n x) (- x 1)))

; sure to overflow with non-tail recursion
(factorial 1 32768) ; Infinity, because JavaScript. Better than a stack overflow!
```

# Semantics
Peach favours:
* Pure functions
* Immutability
* Minimal syntax

# Features
* [Homoiconicity](https://en.wikipedia.org/wiki/Homoiconicity) - code is data is code is data
* Everything is an expression
* Currying
* Dynamic typing
* Strict evaluation
* A JavaScript interpreter
* REPL
* Proper tails calls

# Plans
Coming soon:
* More stdlib
* Maps and vectors
* Lazy sequences

And then:
* Interactive debugger
* JavaScript interop
* Compile to readable JavaScript
* IO

One day:
* A [Hindley-Milner type type system](https://en.wikipedia.org/wiki/Hindley%E2%80%93Milner_type_system)
* Immutable data structures with structural sharing
* Self-hosting

# Develop

Use Node 6+.

```bash
npm install
npm test
```


