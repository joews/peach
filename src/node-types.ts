import { Type } from './types'

export interface AstNode {
  type: string
}

export interface TypeCheckNode extends AstNode {
  exprType: Type
}

// TODO add a `program` prodction so that AST is a single AstNode.
// That will need a refresh of all parser tests, so it will be a separate change.
export type Ast = Array<AstNode>
export type TypedAst = Array<TypeCheckNode>
