const fs = require("fs");
const peg = require("pegjs");

const parserSource = fs.readFileSync("./peach.pegjs", "utf8");
const parser = peg.generate(parserSource);

test(`
(def x 2) (def y 5) (* (+ x y) x)
`);

// x = 2;
// y = 5;
// (x + y) * x;

function test(src) {
  const ast = parser.parse(src);
  const [result, env] = interpret(ast);
  console.log(result);
  console.log(env);
}

function getRootEnv() {
  // TODO stdlibs!
  return {
    "+": (a, b) => a + b,
    "*": (a, b) => a * b
  }
}

function interpret(ast) {
  const rootEnv = getRootEnv();
  const [result, env] = visitAll(ast, rootEnv);

  return [result, env];
}

function visitAll(nodes, rootEnv) {
  let result;
  let env = rootEnv;

  nodes.forEach(node => {
    [result, env] = visit(node, env);
  });

  return [result, env];
}

function visit(node, env) {
  switch (node.type) {
    case "Call":
      return call(node, env);
    case "Def":
      return def(node, env);
    case "Name":
      return read(node, env)
    case "Number":
      return number(node, env)
    default:
      throw new Error("unknown node type: " + node.type);
  }
}

function def({ name, value }, env) {
  if (env.hasOwnProperty(name)) {
    throw new Error(`${name} has already been defined`);
  }

  env[name] = visit(value, env)[0];
  return [value, env];
}

function call({ name, args }, env) {
  const argValues = args.map((node) => visit(node, env)[0]);
  const func = env[name];
  return [func.apply(env, argValues), env];
}

function read({ name }, env) {
  return [env[name], env];
}

function number({ value }, env) {
  return [value, env];
}
