const nearley = require("nearley");
const Yulp = require('./yulplus');
const Yul = require('./yul');
const print = (v, isArr = Array.isArray(v)) => (isArr ? v : [v])
  .map(v => Array.isArray(v) ? print(v) : (!v ? '' : v.value)).join('');

// Export parser
module.exports = {
  nearley,
  Yulp,
  compile: source => {
    const parser = new nearley.Parser(Yulp);
    return parser.feed(source);
  },
  print,
};
