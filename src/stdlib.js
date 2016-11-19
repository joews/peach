const { makeNativeFunction, applyFunction } = require('./function')
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
  map: proxyListFunction('map'),
  filter: proxyListFunction('filter'),
  find: proxyListFunction('find'),
  reverse: makeNativeFunction('reverse', (list) => list.reverse()),
  fold: makeNativeFunction('fold',
    (pFunction, init, list) =>
      list.reduce((e, a) =>
        applyFunction(pFunction, [e, a]), init)),

  cons: makeNativeFunction('cons', (head, tail) => [head, ...tail]),

  // strings
  str: makeNativeFunction('str',
    (...args) => args.map(arg => arg.toString()).join(''),
    1, true
  ),

  // utils
  print: makeNativeFunction('print', (...args) => { console.log(...args) }, 1, true)
}

// Helper fpr creating list functions that call their JavaScript equivalents,
//  invoking the callback with the first argument only
function proxyListFunction (peachName, jsName = peachName) {
  return makeNativeFunction(peachName, (pFunction, list) =>
    list[jsName](e => applyFunction(pFunction, [e]))
  )
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
