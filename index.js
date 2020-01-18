const nearley = require("nearley");
const Yulp = require('./yulp');
const Yul = require('./yul');
const parser = new nearley.Parser(Yul);
const print = v => v
  .map(v => Array.isArray(v) ? print(v) : (v === null ? '' : v.value)).join('');

// Export parser
module.exports = {
  nearley,
  Yulp,
  parser,
  compile: source => parser.feed(source),
  print,
};
