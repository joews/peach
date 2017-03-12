import { Type } from './types'

//
// intermediate representations
// #35 explains why there are several IRs.
//
export type Ast = AstProgramNode
export type TypedAst = TypedProgramNode

// Ast*: parser output. Typed raw AST nodes.
export interface AstNode {
  type: string
}

// Typed*: type checker output. AST nodes augmented with Peach static types.
export interface TypedNode extends AstNode {
  exprType: Type
}

export interface AstProgramNode {
  type: string,
  expressions: AstNode[]
}

export interface TypedProgramNode extends AstProgramNode, TypedNode {
  expressions: TypedNode[]
}

export interface AstDefNode {
  type: string,
  name: string,
  value: AstNode
}

export interface TypedDefNode extends AstDefNode, TypedNode {
  value: TypedNode
}

export interface AstNameNode {
  type: string,
  name: string
}

export interface TypedNameNode extends AstNameNode, TypedNode { }

export interface AstNumeralNode {
  type: string,
  value: number
}

export interface TypedNumeralNode extends AstNumeralNode, TypedNode { }

export interface AstBooleanNode {
  type: string,
  value: boolean
}

export interface TypedBooleanNode extends AstBooleanNode, TypedNode { }

export interface AstStringNode {
  type: string,
  value: string
}

export interface TypedStringNode extends AstStringNode, TypedNode { }

export interface AstCallNode {
  type: string,
  fn: AstFunctionNode,
  args: AstNode[]
}

export interface TypedCallNode extends AstCallNode, TypedNode {
  fn: TypedFunctionNode,
  args: TypedNode[]
}

export interface AstArrayNode {
  type: string,
  values: AstNode[]
}

export interface TypedArrayNode extends AstArrayNode, TypedNode {
  values: TypedNode[]
}

export interface AstDestructuredArrayNode {
  type: string,
  head: AstNode,
  tail: AstNode
}

export interface TypedDestructuredArrayNode extends AstDestructuredArrayNode, TypedNode {
  head: TypedNode,
  tail: TypedNode
}

export interface AstFunctionNode {
  type: string,
  clauses: AstFunctionClauseNode[]
}

export interface TypedFunctionNode extends AstFunctionNode, TypedNode {
  clauses: TypedFunctionClauseNode[]
}

export interface AstFunctionClauseNode {
  type: string,
  pattern: AstNode[],
  body: AstNode[]
}

export interface TypedFunctionClauseNode extends AstFunctionClauseNode, TypedNode {
  pattern: TypedNode[],
  body: TypedNode[]
}

export interface AstIfNode {
  type: string,
  condition: AstNode,
  ifBranch: AstNode,
  elseBranch: AstNode
}

export interface TypedIfNode extends AstIfNode, TypedNode {
  condition: TypedNode,
  ifBranch: TypedNode,
  elseBranch: TypedNode
}

//
// Type guard functions
//
export function isAstNameNode (node: AstNode): node is AstNameNode {
  return node.type === 'Name'
}

//
// Runtime values
// TODO
//
export type Value = any

export interface ValueNode {
  exprType: Type,
  node: AstNode,
  value: Value
}
