const nearley = require("nearley");
const Resolve = require('./resolve');
const Yulp = require('./yulplus');
const Yul = require('./yul');
const print = (v, isArr = Array.isArray(v)) => (isArr ? v : [v])
  .map(v => Array.isArray(v) ? print(v) : (!v ? '' : v.value)).join('');

function flatDeep(input) {
  const stack = [...input];
  const res = [];
  while(stack.length) {
    // pop value from stack
    const next = stack.pop();
    if(Array.isArray(next)) {
      // push back array items, won't modify the original input
      stack.push(...next);
    } else {
      res.push(next);
    }
  }
  // reverse to restore input order
  return res.reverse();
}

function _filter(arr, kind, prop = 'type', stopKind = 'Nothing') {
  var isStopKind = false;

  return flatDeep(arr, 10000000)
    .filter(v => {
      if (v[prop] === stopKind) {
        isStopKind = true;
      }

      if (isStopKind === true) {
        return false;
      }

      return v[prop] === kind;
    });
}

const unique = arr => [...(new Set(arr))];

// Export parser
module.exports = {
  nearley,
  Yulp,
  compile: source => {
    const parserR = new nearley.Parser(Resolve);
    const resolved = parserR.feed(source);

    const parser = new nearley.Parser(Yulp);
    const result = parser.feed(print(resolved.results));

    const signatures = _filter(result.results, true, 'isSignature')
      .filter((v,i,a)=>a.findIndex(t=>(t.value === v.value))===i)
      .map(v => ({ abi: v.signature, signature: v.value }));
    const errors = _filter(result.results, true, 'isError')
      .reduce((acc, v) => Object.assign(acc, { [v.message]: v.hash, [v.hash]: v.message }), {});
    const topics = _filter(result.results, true, 'isTopic')
      .filter((v,i,a)=>a.findIndex(t=>(t.value === v.value))===i)
      .map(v => ({ abi: v.topic, topic: v.value }));

    result.signatures = signatures;
    result.topics = topics;
    result.errors = errors;

    return result;
  },
  print,
};
