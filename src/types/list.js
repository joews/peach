// TODO List wrapper type
function isList ({ type }) {
  return type === 'List'
}

// TODO generic value-based equality. This fails for nested lists
//  because the `every` check uses ===. It needs to find the value equality
//  function for the operand types.
function isEqual (listA, listB) {
  return listA.length === listB.length &&
    listA.every((v, i) => v === listB[i])
}

module.exports = {
  isList,
  isEqual
}
