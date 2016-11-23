// TODO Array wrapper type
function isArray ({ type }) {
  return type === 'Array'
}

// TODO generic value-based equality. This fails for nested arrays
//  because the `every` check uses ===. It needs to find the value equality
//  function for the operand types.
function isEqual (arrayA, arrayB) {
  return arrayA.length === arrayB.length &&
    arrayA.every((v, i) => v === arrayB[i])
}

module.exports = {
  isArray,
  isEqual
}
