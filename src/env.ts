import stdlib from './stdlib'
import { clone } from './util'
import { TypeCheckNode } from './node-types'

// Return the default environment for a new program
export function getRootEnv () {
  return clone(stdlib)
}

export type TypeEnv = { [name: string]: TypeCheckNode }

// TODO
export type RuntimeEnv =  any
