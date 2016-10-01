"use strict"
const fs = require("fs");
const peg = require("pegjs");

const parserSource = fs.readFileSync("./peach.pegjs", "utf8");
const parser = peg.generate(parserSource);

function test(src) {
  require("chalkline").green();
  const ast = parser.parse(src);
  // console.log(JSON.stringify(ast, null, 2));

  require("chalkline").blue();
  const [result, env] = interpret(ast);

  require("chalkline").red();
  // console.log(env);
  console.log(result);
}

function getRootEnv() {
  // TODO stdlibs!
  return {
    "+": (a, b) => a + b,
    "*": (a, b) => a * b,
    map: (fn, list) => list.map(e => fn(e))
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
