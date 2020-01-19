const nearley = require("nearley");
const Yulp = require('./yulp');
const Yul = require('./yul');
const print = v => v
  .map(v => Array.isArray(v) ? print(v) : (!v ? '' : v.value)).join('');

// Export parser
module.exports = {
  nearley,
  Yulp,
  compile: source => {
    const parser = new nearley.Parser(Yul);
    return parser.feed(source);
  },
  print,
};
