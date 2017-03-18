import { Type } from './types'

//
// intermediate representations
// #35 explains why there are several IRs.
//
export type Ast = AstProgramNode
export type TypedAst = TypedProgramNode

// Ast*: parser output. Typed raw AST nodes.
export interface AstBaseNode {
  kind: string
}

export type AstNode
  = AstProgramNode
  | AstDefNode
  | AstIdentifierNode
  | AstNumberNode
  | AstBooleanNode
  | AstStringNode
  | AstCallNode
  | AstArrayNode
  | AstDestructuredArrayNode
  | AstFunctionNode
  | AstFunctionClauseNode
  | AstIfNode
  | AstTupleNode
  | AstMemberNode
  | AstDefPreValueNode

// Typed*: type checker output. AST nodes augmented with Peach static types.
export type TypedNode
  = TypedProgramNode
  | TypedDefNode
  | TypedIdentifierNode
  | TypedNumberNode
  | TypedBooleanNode
  | TypedStringNode
  | TypedCallNode
  | TypedArrayNode
  | TypedDestructuredArrayNode
  | TypedFunctionNode
  | TypedFunctionClauseNode
  | TypedIfNode
  | TypedTupleNode
  | TypedMemberNode
  | TypedDefPreValueNode

export interface Typed {
  type: Type
}

export interface AstProgramNode {
  kind: 'Program',
  expressions: AstNode[]
}

export interface TypedProgramNode extends AstProgramNode, Typed {
  expressions: TypedNode[]
}

export interface AstDefNode {
  kind: 'Def',
  name: string,
  value: AstNode
}

export interface TypedDefNode extends AstDefNode, Typed {
  value: TypedNode
}

export interface AstIdentifierNode {
  kind: 'Identifier',
  name: string
}

export interface TypedIdentifierNode extends AstIdentifierNode, Typed { }

export interface AstNumberNode {
  kind: 'Number',
  value: number
}

export interface TypedNumberNode extends AstNumberNode, Typed { }

export interface AstBooleanNode {
  kind: 'Boolean',
  value: boolean
}

export interface TypedBooleanNode extends AstBooleanNode, Typed { }

export interface AstStringNode {
  kind: 'String',
  value: string
}

export interface TypedStringNode extends AstStringNode, Typed { }

export interface AstCallNode {
  kind: 'Call',
  fn: AstNode,
  args: AstNode[]
}

export interface TypedCallNode extends AstCallNode, Typed {
  fn: TypedFunctionNode,
  args: TypedNode[]
}

export interface AstArrayNode {
  kind: 'Array',
  values: AstNode[]
}

export interface TypedArrayNode extends AstArrayNode, Typed {
  values: TypedNode[]
}

export interface AstDestructuredArrayNode {
  kind: 'DestructuredArray',
  head: AstNode,
  tail: AstNode
}

export interface TypedDestructuredArrayNode extends AstDestructuredArrayNode, Typed {
  head: TypedNode,
  tail: TypedNode
}

export interface AstFunctionNode {
  kind: 'Function',
  clauses: AstFunctionClauseNode[]
}

export interface TypedFunctionNode extends AstFunctionNode, Typed {
  clauses: TypedFunctionClauseNode[]
}

export interface AstFunctionClauseNode {
  kind: 'FunctionClause',
  pattern: AstNode[],
  body: AstNode[]
}

export interface TypedFunctionClauseNode extends AstFunctionClauseNode, Typed {
  pattern: TypedNode[],
  body: TypedNode[]
}

export interface AstIfNode {
  kind: 'If',
  condition: AstNode,
  ifBranch: AstNode,
  elseBranch: AstNode
}

export interface TypedIfNode extends AstIfNode, Typed {
  condition: TypedNode,
  ifBranch: TypedNode,
  elseBranch: TypedNode
}

export interface AstTupleNode {
  kind: 'Tuple',
  values: AstNode[]
}

export interface TypedTupleNode extends AstTupleNode, Typed {
  values: TypedNode[]
}

export interface AstMemberNode {
  kind: 'Member',
  source: AstNode,
  name: AstNode
}

export interface TypedMemberNode extends AstMemberNode, Typed {
  source: TypedNode,
  name: TypedNode
}

//
// Pseudo-node types
//

// A special marker pseudo-node used to represent the value of a
// `Def` node during type checking, before descending into the value itself.
// We only need the Typed variant, but the Ast*Node is required to maintain
// the AstNode -> TypedNode mapping.
export interface AstDefPreValueNode {
  kind: 'DefPreValue'
}

export interface TypedDefPreValueNode extends Typed, AstDefPreValueNode { }

//
// Nodes with shared traits
//
export type AstLiteralNode = AstStringNode | AstBooleanNode | AstNumberNode
export type TypedLiteralNode = TypedStringNode | TypedBooleanNode | TypedNumberNode

//
// Guard functions
//
export function isAstLiteralNode (node: AstNode): node is AstLiteralNode {
  return ['Boolean', 'String', 'Number'].includes(node.kind)
}

//
// Runtime values
// TODO
//
export type Value = any

export interface ValueNode {
  type: Type,
  node: AstNode,
  value: Value
}
