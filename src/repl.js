const repl = require("repl");

const { version } = require("../package.json");
const { parse, interpret } = require("../index.js");

module.exports = function startRepl (onExit) {
  console.log(`🍑  peach v${version}`);

  // remember the environment from each command to pass to the next
  let lastEnv;

  function evalPeach(src, context, filename, callback) {
    const [result, env] = interpret(parse(src), lastEnv);
    lastEnv = env;

    callback(null, result);
  }

  const server = repl.start({
    prompt: "> ",
    eval: evalPeach
  });
  server.on("exit", onExit);
}
