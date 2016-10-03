module.exports = function unify (patterns, values) {
  if (patterns.length !== values.length) {
    return didNotMatch
  }

  const bindings = {}
  for (const [pattern, value] of zip(patterns, values)) {
    const attemptBind = unifyOne(pattern, value)
    if (attemptBind !== null) {
      Object.assign(bindings, attemptBind)
    } else {
      return didNotMatch
    }
  }

  return didMatch(bindings)
}

function unifyOne (pattern, value) {
  // TODO value equality operator
  if (isValue(pattern) && pattern.value === value) {
    // the pattern matched, but there is nothing to bind
    return {}
  }

  if (isName(pattern)) {
    // the pattern matched; return a new binding
    return { [pattern.name]: value }
  }

  // no match
  return null
}

const didNotMatch = {
  didMatch: false
}

function didMatch (bindings) {
  return {
    didMatch: true,
    bindings
  }
}

function isName ({ type }) {
  return type === 'Name'
}

function isValue ({ type }) {
  return ['Bool', 'Str', 'Numeral'].includes(type)
}

// TODO stdlib
function zip (listA, listB) {
  return listA.map((e, i) => [e, listB[i]])
}

