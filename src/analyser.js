const { extend, clone } = require('./util')

module.exports = function interpret (rawAst, rootEnv) {
  return visitAll(rawAst, rootEnv)
}

// Visit each of `nodes` in order, returning the result
// and environment of the last node.
function visitAll (nodes, env) {
  // TODO immutable env
  return nodes.map(node => visit(node, env)[0])
}

function visit (node, env) {
  const visitor = visitors[node.type]
  return visitor(node, env)
}

const visitors = {
  Def (node, env) {
    const value = visit(node.value, env)[0]
    return [extend(node, { value }), env]
  },

  Name (node, env) {
    return [clone(node), env]
  },

  Numeral (node, env) {
    return [clone(node), env]
  },

  Bool (node, env) {
    return [clone(node), env]
  },

  Str (node, env) {
    return [clone(node), env]
  },

  List (node, env) {
    const values = node.values.map((value) => visit(value, env)[0])
    return [extend(node, { values }, env)]
  },

  DestructuredList (node, env) {
    const head = visit(node.head, env)[0]
    const tail = visit(node.tail, env)[0]

    return [extend(node, { head, tail }), env]
  },

  Fn (node, env) {
    const clauses = node.clauses.map((clause) => ({
      pattern: clause.pattern.map(p => visit(p, env)[0]),
      body: visit(clause.body, env)[0]
    }))

    return [extend(node, { clauses }), env]
  },

  If (node, env) {
    const clauses = node.clauses.map(([test, consequent]) => {
      return [
        visit(test, env)[0],
        visit(consequent, env)[0]
      ]
    })

    return [extend(node, { clauses }), env]
  }
}
