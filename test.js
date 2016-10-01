"use strict"
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const peg = require("pegjs");

const parserSource = fs.readFileSync("./peach.pegjs", "utf8");
const parser = peg.generate(parserSource);

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function test(src, expected) {
  require("chalkline").green();
  const ast = parser.parse(src);
  // console.log(JSON.stringify(ast, null, 2));

  require("chalkline").blue();
  const [result, env] = interpret(ast);

  require("chalkline").red();
  // console.log(env);
  console.log(result);

  if (expected != void 0) {
    assert.strictEqual(result, expected);
  }

  return result;
}

function getRootEnv() {
  // TODO stdlibs!
  return {
    // operators
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => a / b,
    "%": (a, b) => a % b,
    ">": (a, b) => a > b,
    ">=": (a, b) => a >= b,
    "=": (a, b) => a === b,
    "<": (a, b) => a < b,
    "<=": (a, b) => a <= b,
    "<=>": (a, b) => {
      if (a > b) return 1;
      if (a < b) return -1;
      if (a === b) return 0;
      // I think this can only with NaN <=> NaN in JS. It should be possible
      // to ignore this case when peach has static types, since we know
      // that the operands are comparable if they pass the type check.
      throw new Error(`${a} and ${b} are not comparable`)
    },

    // lists
    map: (fn, list) => list.map(e => fn(e)),

    // utils
    print: (...args) => { console.log(...args) }
  }
}

function interpret(ast) {
  const rootEnv = getRootEnv();
  const [result, env] = visitAll(ast, rootEnv);

  return [result, env];
}

// Visit each of `nodes` in order, returning the result
// and environment of the last node.
function visitAll(nodes, rootEnv) {
  return nodes.reduce(([, env], node) => (
    visit(node, env)
  ), [null, rootEnv]);
}

function visitUnknown(node) {
  throw new Error(`unknown node type: ${node.type}`);
  console.log(JSON.stringify(node, null, 2));
}

function visit(node, env) {
  const visitor = visitors[node.type] || visitUnknown;

  console.log(`trace: ${node.type}`)
  return visitor(node, env);
}

const visitors = {
  Def({ name, value }, env) {
    if (env.hasOwnProperty(name)) {
      throw new Error(`${name} has already been defined`);
    }

    const [result] = visit(value, env);
    env[name] = result;
    return [result, env];
  },

  Name({ name }, env) {
    if (!(name in env)) {
      throw new Error(`${name} is not defined`);
    }

    return [env[name], env];
  },

  Numeral({ value }, env) {
    return [value, env];
  },

  Bool({ value }, env) {
    return [value, env];
  },

  Str({ value }, env) {
    return [value, env];
  },

  List({ values, isQuoted }, env) {
    const results = values.map((value) => visit(value, env)[0]);

    if (isQuoted) {
      return [results, env];
    } else {
      const [fn, ...args] = results;
      return [apply(fn, args), env]
    }
  },

  Fn({ declaredArgs, body }, parentEnv) {
    const env = Object.create(parentEnv);
    declaredArgs.forEach(arg => {
      env[arg.name] = null;
    });

    const fn = (...args) => {
      declaredArgs.forEach((arg, i) => {
        env[arg.name] = args[i];
      });

      const [returnValue] = visit(body, env);
      return returnValue;
    }

    return [fn, parentEnv];
  },

  If({ clauses }, env) {
    for (const [test, consequent] of clauses) {
      // TODO a formal "else" concept - for now use `true`.
      const [testResult] = visit(test, env);
      if (isTruthy(testResult)) {
        return visit(consequent, env);
      }
    }

    // TODO fail to compile if not all outcomes are accounted for;
    // reutrn null until peach has static typing
    return [null, env];
  }
};

function apply(fn, args) {
  return (args.length >= fn.length)
    ? call(fn, args)
    : curry(fn, args);
}

function call(fn, args) {
  return fn.apply(null, args);
}

function curry(fn, appliedArgs) {
  return fn.bind(null, ...appliedArgs);
}

function isTruthy(value) {
  return value !== false && value != null;
}

// setting and getting values
test(`
(def x 2) (def y 5) (* (+ x y) x)
`);

// quoted s-expressions
test(`
(def list '(1 2 3))
`);

// reference error
try {
  test(`(y)`);
} catch (e) {
  console.log(e.message);
}

// currying
test(`
(def plus-one (+ 1))
(def all-plus-one (map plus-one))
(all-plus-one '(9 8 7))
`)

// function definition
test(`
  (def id (id => id))
  (id 2)

  (def double (x => (* x 2)))
  (double 1001)
`)

// if
test(`
(?
  false 3
  true 4
)
`);

// truthiness
test(`(? false 1)`); // falsy
test(`(? 0 1)`); // truthy

// strings - easier to test without JS String literal escapes
const strings = test(read(__dirname + "/test/str.peach"));
console.log(strings.join("\n"));

// comments
test(`
; I heard that commenting code is a good thing
;; define x to be 9
(def x 9)
# add one to x
(+ x 2)
###### the program is finished ######
`);

// commas are whitespace
test(`'(1, 2,              ,,,,,,,,, 3)`);

// comparisons
test(`(= 1 1)`, true);
test(`(= 1 0)`, false);
test(`(= 0 false)`, false);
test(`(< 1 0)`, false);
test(`(> 1 0)`, true);
test(`(<=> 1 0)`, 1);
test(`(<=> 1 1)`, 0);
test(`(<=> 0 1)`, -1);
