# peach

A cheeky functional language.

# Syntax sketches
S-Expressions! Peach is heavily inspired by Clojure and @bodil's [BODOL](https://github.com/bodil/BODOL), which I learned about from [this awesome talk](https://www.youtube.com/watch?v=DHubfS8E--o).

```clojure
# assignment
(= x 2)

# maths and stuff
(* x 2) # 4

# data structure literals
(= list [1 2 3 4])
(= dict {
  x: 1
  y: 2
})

# conditionals
(?
  true "yes"
  false "no"
  _ "wat"
) # "yes"

# functions
(fn double
  x => (* x 2)
)

(map list double) # [2 4 6 8]

# anonymous functions
(map x (x => (pow x 2))) # [2 4 8 16]

# pattern matching
(fn fib
  0 => 1
  1 => 1
  x => (+ (fib x - 2) (fib x - 1))
)
```

# Semantics
Peach favours:
* Expressions
* Pure functions
* Immutability
* Clean syntax

Peach has, for now:
* Dynamic typing
* Frequent stack overflows
* Lots of object churn
* A slow JavaScript interpreter

# Plans
Peach would like:
* A logic system to do pattern matching
* Static typing with something like [Hindley-Milner type inference](https://en.wikipedia.org/wiki/Hindley%E2%80%93Milner_type_system)
* Proper tails calls
* An interactive debugger
* Data structures with structural sharing
* JavaScript interop
* To compile to readable JavaScript
* To self-host



