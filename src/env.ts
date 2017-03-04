import stdlib from './stdlib'
import { clone } from './util'

// Return the default environment for a new program
export function getRootEnv () {
  return clone(stdlib)
}