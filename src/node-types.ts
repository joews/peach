import { Type } from './types'

export interface AstNode {
  type: string
}

export interface TypeCheckNode extends AstNode {
  exprType: Type
}

export type Ast = AstNode
export type TypedAst = TypeCheckNode
