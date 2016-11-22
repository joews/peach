// TODO Vector wrapper type
function isVector ({ type }) {
  return type === 'Vector'
}

// TODO generic value-based equality. This fails for nested vectors
//  because the `every` check uses ===. It needs to find the value equality
//  function for the operand types.
function isEqual (vectorA, vectorB) {
  return vectorA.length === vectorB.length &&
    vectorA.every((v, i) => v === vectorB[i])
}

module.exports = {
  isVector,
  isEqual
}
