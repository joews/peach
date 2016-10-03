const test = require('ava')
const unify = require('../src/unify.js')

test('can unify one matching value', (t) => {
  const patterns = [{ type: 'Str', value: 'hai' }]
  const values = ['hai']
  t.deepEqual(unify(patterns, values), {
    didMatch: true,
    bindings: {}
  })
})

test('can unify several matching values', (t) => {
  const patterns = [{ type: 'Numeral', value: 1 }, { type: 'Numeral', value: 2 }]
  const values = [1, 2]
  t.deepEqual(unify(patterns, values), {
    didMatch: true,
    bindings: {}
  })
})

// TODO this test is better handled by a type system
test('cannot unify a loosely equal value', (t) => {
  const patterns = [{ type: 'Numeral', value: 0 }]
  const values = [false]
  t.deepEqual(unify(patterns, values), { didMatch: false })
})

test('cannot unify when the number of patterns and values differs', (t) => {
  const patterns = [{ type: 'Numeral', value: 1 }, { type: 'Numeral', value: 2 }]
  const values = [1]
  t.deepEqual(unify(patterns, values), { didMatch: false })
})

test('cannot unify when some but not all patterns match', (t) => {
  const patterns = [{ type: 'Numeral', value: 1 }, { type: 'Numeral', value: 2 }]
  const values = [1, 3]
  t.deepEqual(unify(patterns, values), { didMatch: false })
})

test('can unify a variable', (t) => {
  const patterns = [{ type: 'Name', name: 'x' }]
  const values = [1]
  t.deepEqual(unify(patterns, values), {
    didMatch: true,
    bindings: { x: 1 }
  })
})

test('can unify mixed variables and values', (t) => {
  const patterns = [{ type: 'Name', name: 'x' }, { type: 'Numeral', value: 2 }]
  const values = [1, 2]
  t.deepEqual(unify(patterns, values), {
    didMatch: true,
    bindings: { x: 1 }
  })
})
