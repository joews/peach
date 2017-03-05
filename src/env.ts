import stdlib from './stdlib'
import { clone, extend } from './util'
import { AstNode, TypedNode, ValueNode } from './node-types'

// Return the default environment for a new program
export function getRootEnv (): RuntimeEnv {
  return clone(stdlib)
}

export function getTypeEnv (valueEnv: RuntimeEnv) : TypeEnv {
  return Object.keys(valueEnv).reduce((env, name) => {
    env[name] = extend(valueEnv[name], {
      exprType: valueEnv[name].exprType
    })
    return env
  }, {})
}

export type TypeEnv = { [name: string]: TypedNode<AstNode> }

// TODO
export type RuntimeEnv = { [name: string]: ValueNode }
