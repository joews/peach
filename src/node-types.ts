import { Type } from './types'

export interface AstNode {
  type: string
}

export interface AstProgramNode {
  type: string,
  expressions: AstNode[]
}

export interface AstDefNode {
  type: string,
  name: string,
  value: AstNode
}

export interface AstNameNode {
  type: string,
  name: string
}

export interface AstNumeralNode {
  type: string,
  value: number
}

export interface AstBooleanNode {
  type: string,
  value: boolean
}

export interface AstStringNode {
  type: string,
  value: string
}

export interface AstCallNode {
  type: string,
  fn: AstFunctionNode,
  args: AstNode[]
}

export interface AstArrayNode {
  type: string,
  values: AstNode[]
}

export interface AstDestructuredArrayNode {
  type: string,
  head: AstNode,
  tail: AstNode
}

export interface AstFunctionNode {
  type: string,
  clauses: AstFunctionClauseNode[]
}

export interface AstFunctionClauseNode {
  type: string,
  pattern: AstNode[],
  body: AstNode[]
}

export interface AstIfNode {
  type: string,
  condition: AstNode,
  ifBranch: AstNode,
  elseBranch: AstNode
}

export interface Typed {
  exprType: Type
}

export type TypedNode<T extends AstNode> = T & Typed

export function isAstNameNode (node: AstNode): node is AstNameNode {
  return node.type === 'Name'
}

export type Ast = AstProgramNode
export type TypedAst = TypedNode<Ast>

// TODO
export type Value = any

export interface ValueNode {
  exprType: Type,
  node: AstNode,
  value: Value
}
