/* eslint-env jest */
import unify from '../unify'
import { StringType } from '../types'
import { AstNode, AstStringNode, AstNumeralNode, AstNameNode } from '../node-types'

describe('unify', () => {
  it('can unify one matching value', () => {
    const patterns: AstStringNode[] = [{ type: 'Str', value: 'hai' }]
    const values = ['hai']
    expect(unify(patterns, values)).toEqual({
      didMatch: true,
      bindings: {}
    })
  })

  it('can unify several matching values', () => {
    const patterns: AstNumeralNode[] = [{ type: 'Numeral', value: 1 }, { type: 'Numeral', value: 2 }]
    const values = [1, 2]
    expect(unify(patterns, values)).toEqual({
      didMatch: true,
      bindings: {}
    })
  })

  // TODO this test is better handled by a type system
  it('cannot unify a loosely equal value', () => {
    const patterns: AstNumeralNode[] = [{ type: 'Numeral', value: 0 }]
    const values = [false]
    expect(unify(patterns, values)).toEqual({ didMatch: false, bindings: {} })
  })

  it('cannot unify when the number of patterns and values differs', () => {
    const patterns: AstNumeralNode[] = [{ type: 'Numeral', value: 1 }, { type: 'Numeral', value: 2 }]
    const values = [1]
    expect(unify(patterns, values)).toEqual({ didMatch: false, bindings: {} })
  })

  it('cannot unify when some but not all patterns match', () => {
    const patterns: AstNumeralNode[] = [{ type: 'Numeral', value: 1 }, { type: 'Numeral', value: 2 }]
    const values = [1, 3]
    expect(unify(patterns, values)).toEqual({ didMatch: false, bindings: {} })
  })

  it('can unify a variable', () => {
    const patterns: AstNameNode[] = [{ type: 'Name', name: 'x' }]
    const values = [1]
    expect(unify(patterns, values)).toEqual({
      didMatch: true,
      bindings: { x: 1 }
    })
  })

  it('can unify mixed variables and values', () => {
    const patterns: AstNode[] = [{ type: 'Name', name: 'x' }, { type: 'Numeral', value: 2 }]
    const values = [1, 2]
    expect(unify(patterns, values)).toEqual({
      didMatch: true,
      bindings: { x: 1 }
    })
  })
})
