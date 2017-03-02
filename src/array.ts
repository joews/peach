// TODO Array wrapper type
export function isArray ({ type }) {
  return type === 'Array'
}

// TODO generic value-based equality. This fails for nested arrays
//  because the `every` check uses ===. It needs to find the value equality
//  function for the operand types.
export function isEqual (arrayA, arrayB) {
  return arrayA.length === arrayB.length &&
    arrayA.every((v, i) => v === arrayB[i])
}
