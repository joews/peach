/* eslint-env jest */
import unify from '../unify'
import { StringType } from '../types'
import { AstNode, AstStringNode, AstNumberNode, AstIdentifierNode } from '../node-types'

describe('unify', () => {
  it('can unify one matching value', () => {
    const patterns: AstStringNode[] = [{ kind: 'String', value: 'hai' }]
    const values = ['hai']
    expect(unify(patterns, values)).toEqual({
      didMatch: true,
      bindings: {}
    })
  })

  it('can unify several matching values', () => {
    const patterns: AstNumberNode[] = [{ kind: 'Number', value: 1 }, { kind: 'Number', value: 2 }]
    const values = [1, 2]
    expect(unify(patterns, values)).toEqual({
      didMatch: true,
      bindings: {}
    })
  })

  // TODO this test is better handled by a type system
  it('cannot unify a loosely equal value', () => {
    const patterns: AstNumberNode[] = [{ kind: 'Number', value: 0 }]
    const values = [false]
    expect(unify(patterns, values)).toEqual({ didMatch: false })
  })

  it('cannot unify when the number of patterns and values differs', () => {
    const patterns: AstNumberNode[] = [{ kind: 'Number', value: 1 }, { kind: 'Number', value: 2 }]
    const values = [1]
    expect(unify(patterns, values)).toEqual({ didMatch: false })
  })

  it('cannot unify when some but not all patterns match', () => {
    const patterns: AstNumberNode[] = [{ kind: 'Number', value: 1 }, { kind: 'Number', value: 2 }]
    const values = [1, 3]
    expect(unify(patterns, values)).toEqual({ didMatch: false })
  })

  it('can unify a variable', () => {
    const patterns: AstIdentifierNode[] = [{ kind: 'Identifier', name: 'x' }]
    const values = [1]
    expect(unify(patterns, values)).toEqual({
      didMatch: true,
      bindings: { x: 1 }
    })
  })

  it('can unify mixed variables and values', () => {
    const patterns: AstNode[] = [{ kind: 'Identifier', name: 'x' }, { kind: 'Number', value: 2 }]
    const values = [1, 2]
    expect(unify(patterns, values)).toEqual({
      didMatch: true,
      bindings: { x: 1 }
    })
  })
})
