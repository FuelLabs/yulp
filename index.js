const nearley = require("nearley");
const Yulp = require('./yulplus');
const Yul = require('./yul');
const print = v => v
  .map(v => Array.isArray(v) ? print(v) : (!v ? '' : v.value)).join('');

const { utils } = require('ethers');
const abi = new utils.Interface([
  "event Transfer(address from, address to, uint amount)",
]);

console.log(abi.events);

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
