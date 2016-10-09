const parse = require('../src/parser')
const { debug } = require('../src/interpreter')

const program = `
  (def a 1)
  (def b 2)
  (def c 3)
`;

const ast = parse(program);
let next = debug(ast);
let done;



// a
require("chalkline").red();
done = next();
console.log(done.result);
next = done.next;

// b
require("chalkline").blue();
done = next();
console.log(done.next);
next = done.next;

// c
require("chalkline").yellow();
done = next();
console.log(done.next);
next = done.next;

done = next()
console.log(done)
