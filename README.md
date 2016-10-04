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

# Syntax sketches
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

# Plans
Coming soon:
* More stdlib
* Maps and vectors
* Lazy sequences
* Proper tails calls

And then:
* Interactive debugger
* JavaScript interop
* Compile to readable JavaScript
* IO
* Self-hosting

One day:
* Static typing with something like [Hindley-Milner type inference](https://en.wikipedia.org/wiki/Hindley%E2%80%93Milner_type_system)
* _Maybe_ lazy evaluation
* Immutable data structures with structural sharing

# Developing

Use Node 6+.

```bash
npm install
npm test
```


