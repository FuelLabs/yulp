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

function __filter(arr, kind, prop = 'type', stopKind = 'Nothing') {
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

function mapDeep(arr, f, d = 0) {
  return Array.isArray(arr) ? arr.map(v => mapDeep(v, f, d++)) : f(arr, d);
}

function _filter(arr, kind, stopKind = 'Nothing') {
  var isStopKind = false;

  return flatDeep(arr, 10000000)
    .filter(v => {
      if (v.type === stopKind) {
        isStopKind = true;
      }

      if (isStopKind === true) {
        return false;
      }

      return v.type === kind;
    });
}

const unique = arr => [...(new Set(arr))];

const parseImports = require('parse-es6-imports');

// Export parser
module.exports = {
  nearley,
  Yulp,
  compile: (source, fs, base = '') => {
    let result = null;
    const parserR = new nearley.Parser(Resolve);
    const parser = new nearley.Parser(Yulp);

    if (fs) {
      let resolvedFiles = [];
      let resolvedImports = {};
      const path = require('path');
      const resolveFiles = src => {
        const imports = parseImports(src);

        for (const file of imports) {
          if (resolvedFiles.indexOf(file.fromModule) === -1) {
            resolvedImports[file.fromModule] = resolveFiles(fs.readFileSync(path.join(base, file.fromModule), 'utf8'));
          }

          if (resolvedFiles.indexOf(file.fromModule) === -1) {
            resolvedFiles.push(file.fromModule);
          }
        }

        return src;
      };

      const src = resolveFiles(source);
      const res = resolvedFiles.map(v => resolvedImports[v]).join('') + ' ' + src;
      const resolved = parserR.feed(res);
      const target = mapDeep(_filter(resolved.results, 'BaseObject').slice(-1)[0].object, d => {
        if (d.type === 'ParsedObject') {
          d.value = print(d.d);
        }
        return d;
      });

      result = parser.feed(print(target));
    } else {
      // no fs
      const resolved = parserR.feed(source);
      const target = mapDeep(_filter(resolved.results, 'BaseObject').slice(-1)[0].object, d => {
        if (d.type === 'ParsedObject') {
          d.value = print(d.d);
        }
        return d;
      });
      result = parser.feed(print(target));
    }

    const signatures = __filter(result.results, true, 'isSignature')
      .filter((v,i,a)=>a.findIndex(t=>(t.value === v.value)) === i)
      .map(v => ({ abi: v.signature, signature: v.value }));
    const errors = __filter(result.results, true, 'isError')
      .reduce((acc, v) => Object.assign(acc, { [v.message]: v.hash, [v.hash]: v.message }), {});
    const topics = __filter(result.results, true, 'isTopic')
      .filter((v,i,a)=>a.findIndex(t=>(t.value === v.value))===i)
      .map(v => ({ abi: v.topic, topic: v.value }));

    result.signatures = signatures;
    result.topics = topics;
    result.errors = errors;

    return result;
  },
  print,
};
