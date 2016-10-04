const { makeNativeFunction, applyFunction } = require('./types/function')
const { PeachError } = require('./errors')

module.exports = {
  // operators
  '+': op('+', (a, b) => a + b),
  '-': op('-', (a, b) => a - b),
  '*': op('*', (a, b) => a * b),
  '/': op('/', (a, b) => a / b),
  '%': op('%', (a, b) => a % b),
  '>': cmp('>', (a, b) => a > b),
  '>=': cmp('>=', (a, b) => a >= b),
  '=': cmp('=', (a, b) => a === b),
  '<': cmp('<', (a, b) => a < b),
  '<=': cmp('<=', (a, b) => a <= b),

  '<=>': makeNativeFunction('<=>', (a, b) => {
    if (a > b) return 1
    if (a < b) return -1
    if (a === b) return 0
    // I think this can only with NaN <=> NaN in JS. It should be possible
    // to ignore this case when peach has static types, since we know
    // that the operands are comparable if they pass the type check.
    throw new PeachError(`${a} and ${b} are not comparable`)
  }),

  // lists
  map: makeNativeFunction('map', (pFunction, list) =>
    list.map(e => applyFunction(pFunction, [e]))
  ),

  // strings
  str: makeNativeFunction('str',
    (...args) => args.map(arg => arg.toString()).join(''),
    1, true
  ),

  // utils
  print: makeNativeFunction('print', (...args) => { console.log(...args) }, 1, true)
}

// Helper for creating arithmetic functions
function op (name, fn) {
  const variadicOp = (...args) => args.reduce(fn)
  return makeNativeFunction(name, variadicOp, 2, true)
}

// Helper for creating comparison functions
function cmp (name, fn) {
  const variadicCmp = (...args) => args.every((arg, i) =>
    i === 0 || (fn(args[i - 1], args[i]))
  )

  return makeNativeFunction(name, variadicCmp, 2, true)
}
