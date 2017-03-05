import { Type } from './types'

export interface AstNode {
  type: string
}

export interface TypeCheckNode {
  exprType: Type,
  node: AstNode
}

export type Ast = AstNode
export type TypedAst = TypeCheckNode
