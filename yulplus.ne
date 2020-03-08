@{%
  const moo = require('moo')
  const { utils } = require('ethers');
  function id(x) { return x[0]; }

  const print = v => v
    .map(v => Array.isArray(v) ? print(v) : (!v ? '' : v.value)).join('');

  let lexer = moo.compile({
    space: { match: /\s+/, lineBreaks: true },
    singleLineComment: /\/\/.*?$/,
    multiComment: /\/\*[\s\S]*?\*\/|(?:[^\\:]|^)\/\/.*$/,
    NumberLiteral: /(?!0x)[0-9]+/,
    HexLiteral: /(?:hex)(?:"|')[0-9a-fA-F]+(?:"|')/,
    HexNumber: /0[x][0-9a-fA-F]+/,
    StringLiteral: /"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
    equate: ":=",
    "->": "->",
    ",": ",",
    ":": ":",
    SigLiteral: /(?:sig)(?:"|').*(?:"|')/,
    TopicLiteral: /(?:topic)(?:"|').*(?:"|')/,
    codeKeyword: /(?:code)(?:\s)/,
    objectKeyword: /(?:object)(?:\s)/,
    dataKeyword: /(?:data)(?:\s)/,
    boolean: ["true", "false"],
    bracket: ["{", "}", "(", ")", '[', ']'],
    keyword: ['code', 'let', "for", "function", "const", "enum", "mstruct",
      "if", "else", "break", "continue", "default", "switch", "case"],
    Identifier: /[\w.]+/,
  });

  function stringToSig(str) {
    const clean = str.trim();

    if (clean.indexOf("event") === 0) {
      const inter = new utils.Interface([str]);
      return inter.events[Object.keys(inter.events)[0]].topic;
    } else {
      const inter = new utils.Interface([str,]);
      return inter.functions[Object.keys(inter.functions)[0]].sighash;
    }
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

  function _filterKind(arr, kind, stopKind = null) {
    var isStopKind = false;

    return flatDeep(arr, 10000000)
      .filter(v => {
        if (v.kind === stopKind) {
          isStopKind = true;
        }

        if (isStopKind === true) {
          return false;
        }

        return v.kind === kind;
      });
  }

  const stateKind = kind => d => {
    d[0].kind = kind;
    return d;
  }

  function functionCall(d) {
    d[0].type = 'FunctionCallIdentifier';
    d[0].name = d[0].value;

    return d;
  }

  function extractArray(d) {
    return d;
  }

  function addValues(vals) {
    let cummulativeValue = utils.bigNumberify(0);
    let _vals = [0];

    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      const isInt = Number.isInteger(v);

      if (v.type === 'HexLiteral'
        || v.type === 'NumberLiteral'
        || isInt) {
        if (isInt) {
          cummulativeValue = cummulativeValue.add(utils.bigNumberify(v));
        } else {
          cummulativeValue = cummulativeValue.add(v.value);
        }
      } else {
        _vals.push(v);
      }
    }

    // Vals
    _vals[0] = {
      type: 'HexLiteral',
      value: cummulativeValue.toHexString(),
      text: cummulativeValue.toHexString(),
      toString: () => cummulativeValue.toHexString(),
    };

    return _vals
      .map(v => `safeAdd(${v.value || v}, `)
      .concat(['0'])
      .concat(Array(_vals.length).fill(')'))
      .join('');
  }

  const sliceMethod = `
function mslice(position, length) -> result {
  if gt(length, 32) { revert(0, 0) } // protect against overflow

  result := div(mload(position), exp(2, sub(256, mul(length, 8))))
}

`;
  const sliceObject = {
    value: sliceMethod,
    text: sliceMethod,
    type: 'MethodInjection',
    toString: () => sliceMethod,
  };

  const requireMethod = `
function require(arg) {
  if lt(arg, 1) {
    revert(0, 0)
  }
}
`;

  // Include safe maths
  let includeSafeMaths = false;
%}

@lexer lexer

Yul -> (_ Chunk):* _ {% function(d) { includeSafeMaths = false; return d; } %}
Chunk -> ObjectDefinition | CodeDefinition {% function(d) { return d; } %}
ObjectDefinition -> %objectKeyword _ %StringLiteral _ "{" ( _ objectStatement):* _ "}"
objectStatement -> CodeDefinition {% function(d) { return d[0]; } %}
  | DataDeclaration {% function(d) { return d[0]; } %}
  | ObjectDefinition {% function(d) { return d[0]; } %}
DataDeclaration -> %dataKeyword _ %StringLiteral _ (%StringLiteral | %HexLiteral)
CodeDefinition -> %codeKeyword _ Block {%
  function (d) {
    // Inject slice method
    const usesSlice = _filter(d, 'FunctionCallIdentifier')
      .filter(v => v.value === 'mslice' || v._includeMarker === 'mslice')
      .length > 0;

    if (usesSlice) {
      d[2].splice(2, 0, sliceObject);
    }

    return d;
  }
%}
Block -> "{" _ Statement (_ Statement):* _ "}" {% function(d, l, reject) {
  // Scan for enums and constant declarations
  const enums = _filter(d, 'Enum')
    .reduce((acc, v) => Object.assign(acc, v.dataMap), {});
  const constants = _filter(d, 'Constant')
    .reduce((acc, v) => Object.assign(acc, v.dataMap), {});
  const mstructs = _filter(d, 'MemoryStructDeclaration')
    .reduce((acc, v) => Object.assign(acc, v.dataMap), {});
  const methodToInclude = {};
  const duplicateChecks = {};
  let err = null;
  const dubcheck = (_type, v) => {
    if (typeof duplicateChecks[_type + v.name] === 'undefined') {
      duplicateChecks[_type + v.name] = v;
    } else {
      throw new Error(`${_type} already declared with the same identifier "${v.name}" on line ${duplicateChecks[_type + v.name].line} and ${v.line}. All ${_type} must have the unique names. Scoping coming soon.`);
    }
  };

  let _map = mapDeep(d, v => {
    if (err) { throw new Error(err) }

    // We have now set within this block context, this enum to Used
    if (v.type === 'Enum') {
      v.type = 'UsedEnum';
    }

    if (v.type === 'UsedEnum') {
      dubcheck('Enum', v);
    }

    // Set constants in context to used
    if (v.type === 'Constant') {
      v.type = 'UsedConstant';
    }

    if (v.type === 'UsedConstant') {
      for (let vi = 0; vi < v.__itendifiers.length; vi++) {
        dubcheck('Constant', Object.assign(v, {
          name: v.__itendifiers[vi],
        }));
      }
    }

    // Used now..
    if (v.type === 'MemoryStructDeclaration') {
      v.type = 'UsedMemoryStructDeclaration';
    }

    if (v.type === 'UsedMemoryStructDeclaration') {
      dubcheck('MemoryStructDeclaration', v);
    }

    // Check for constant re-assignments
    if (v.type === 'Assignment') {
      for (var i = 0; i < v._identifiers.length; i++) {

        if (typeof constants[v._identifiers[i].value] !== 'undefined') {
          throw new Error(`Constant re-assignment '${v._identifiers[i].value}' to '${print(v._value)}' at line ${v.line}`)
        }
      }
    }

    // Replace enums
    if (v.type === 'Identifier'
      && typeof enums[v.value] !== "undefined") {

      // Replace out enums
      v.value = enums[v.value];
      v.text = enums[v.value];
    }

    if (v.type === 'FunctionCallIdentifier'
      && typeof mstructs[v.name] !== 'undefined') {

      includeSafeMaths = true;
      methodToInclude[v.name] = "\n" + mstructs[v.name].method + "\n";

      // include the required methods from the struct
      for (var im = 0; im < mstructs[v.name].required.length; im++) {
        const requiredMethodName = mstructs[v.name].required[im];

        // this has to be recursive for arrays etc..
        methodToInclude[requiredMethodName] = "\n"
          + mstructs[requiredMethodName].method
          + "\n";
      }
    }

    // Safe Math Multiply
    if (v.type === 'FunctionCallIdentifier'
      && v.name === 'require') {
      methodToInclude['require'] = requireMethod;
    }

    if (v.type === 'FunctionCallIdentifier'
      && v.name === 'add') {
      includeSafeMaths = true;
      v.text = 'safeAdd';
      v.value = 'safeAdd';
    }

    if (v.type === 'FunctionCallIdentifier'
      && v.name === 'sub') {
      includeSafeMaths = true;
      v.text = 'safeSub';
      v.value = 'safeSub';
    }

    if (v.type === 'FunctionCallIdentifier'
      && v.name === 'mul') {
      includeSafeMaths = true;
      v.text = 'safeMul';
      v.value = 'safeMul';
    }

    // Return object
    return v;
  });

  if (includeSafeMaths) {
    methodToInclude['require'] = requireMethod;
    methodToInclude['safeAdd'] = `
function safeAdd(x, y) -> z {
  z := add(x, y)
  require(or(eq(z, x), gt(z, x)))
}
`;

    methodToInclude['require'] = requireMethod;
    methodToInclude['safeSub'] = `
function safeSub(x, y) -> z {
  z := sub(x, y)
  require(or(eq(z, x), lt(z, x)))
}
`;

    methodToInclude['require'] = requireMethod;
    methodToInclude['safeMul'] = `
function safeMul(x, y) -> z {
  if gt(y, 0) {
    z := mul(x, y)
    require(eq(div(z, y), x))
  }
}
`;
  }

  // inject mslice if any mstruct method used.
  if (Object.keys(methodToInclude).length > 0) {
    _map.splice(2, 0, {
      type: 'FunctionCallIdentifier',
      value: '',
      text: '',
      _includeMarker: 'mslice',
      toString: () => '',
    });
    includeSafeMaths = true;
  }

  // add methods to include
  _map.splice(2, 0, Object.keys(methodToInclude)
      .map(key => ({
    type: 'InjectedMstructMethod',
    value: methodToInclude[key],
    text: methodToInclude[key],
    toString: () => methodToInclude[key],
  })));

  return _map;
} %}
  | "{" _ "}" {% extractArray %}
Switch -> "switch" _ Expression _ SwitchDefinitions
SwitchDefinitions -> SwitchDefinition (_ SwitchDefinition):* {%
  function(d) {
    const clean = d.filter(v => v);
    return d;
  }
%}
SigLiteral -> %SigLiteral {%
  function(d) {
    const sig = stringToSig(d[0].value.trim().slice(4).slice(0, -1)); // remove sig" and "
    return { type: 'HexNumber', value: sig, text: sig };
  }
%}
TopicLiteral -> %TopicLiteral {%
  function(d) {
    const sig = stringToSig(d[0].value.trim().slice(6, -1));
    return { type: 'HexNumber', value: sig, text: sig };
  }
%}
Boolean -> %boolean {% function(d) {
  if (d[0].value === "true") {
    return { type: 'HexNumber', value: '0x01', text: '0x01' };
  } else {
    return { type: 'HexNumber', value: '0x00', text: '0x00' };
  }
} %}
EnumDeclaration -> "enum" _ %Identifier _ "(" _ ")" {%
    function (d) {
      return {};
    }
  %}
  | "enum" _ %Identifier _ "(" _ IdentifierList _ ")" {%
  function (d) {
    const ids = _filter(d, 'Identifier');
    const name = ids[0].value;
    const markers = ids.slice(1);
    const dataMap = markers
      .reduce((acc, v, i) => Object.assign(acc, {
        [name + '.' + v]: i,
      }), {});

    return {
      type: 'Enum',
      value: '',
      text: '',
      ids,
      name,
      markers,
      line: ids[0].line,
      toString: () => '',
      dataMap,
    };
  }
%}
ForLoop -> "for" _ "{" (_ Statement):* _ "}" _ Expression _ "{" (_ Statement):* _ "}" _ Block
BreakContinue -> "break" | "continue"
SwitchDefinition -> Case | Default
Case -> "case" _ Literal _ Block
Default -> "default" _ Block
Statement -> FunctionDefinition
  | FunctionCall
  | ForLoop
  | VariableDeclaration
  | ConstantDeclaration
  | MemoryStructDeclaration
  | EnumDeclaration
  | IfStatement
  | Assignment
  | Switch
  | BreakContinue
IfStatement -> "if" _ Expression _ Block
NumericLiteral -> %NumberLiteral {% id %}
  | %HexNumber {% id %}
  | SigLiteral {% id %}
  | TopicLiteral {% id %}
Literal -> %StringLiteral {% id %}
  | NumericLiteral {% id %}
Expression -> Literal {% id %}
  | %Identifier {% id %}
  | FunctionCall {% id %}
  | Boolean {% id %}
FunctionCall -> %Identifier _ "(" _ Expression ( _ "," _ Expression):* _ ")" {% functionCall %}
  | %Identifier _ "(" _ ")" {% functionCall %}
ArraySpecifier -> "[" _ NumericLiteral _ "]" {%
  function (d) {
    return {
      type: 'ArraySpecifier',
      value: d[2].value,
      text: d[2].value,
    };
  }
%}
IdentifierList -> %Identifier (_ "," _ %Identifier):* {% extractArray %}
MemoryStructIdentifier -> %Identifier _ ":" _ ( NumericLiteral | ArraySpecifier ) {%
  function (d) {
    // check memory struct nuermic literal or identifier
    const size = utils.bigNumberify(d[4][0].value);

    return {
      type: 'MemoryStructIdentifier',
      name: d[0].value,
      value: d[4][0],
    };
  }
%}
MemoryStructList -> MemoryStructIdentifier (_ "," _ MemoryStructIdentifier):* {% extractArray %}
MemoryStructDeclaration -> "mstruct" _ %Identifier _ "(" _ ")" {% function(d) {
    return {
      type: 'MemoryStructDeclaration',
      name: d[2].value,
      dataMap: {},
      value: '',
      text: '',
      line: d[2].line,
      toString: () => '',
    };
} %}
  | "mstruct" _ %Identifier _ "(" _ MemoryStructList _ ")" {%
  function (d) {
    const name = d[2].value;
    const properties = _filter(d[6], 'MemoryStructIdentifier');
    let methodList = properties.map(v => name + '.' + v.name);

    // check for array length specifiers
    for (var p = 0; p < properties.length; p++) {
      const prop = properties[p];

      if (prop.value.type === 'ArraySpecifier'
        && methodList.indexOf(name + '.' + prop.name + '.length') === -1) {
        throw new Error(`In memory struct "${name}", array property "${prop.name}" requires a ".length" property.`);
      }
    }

    let dataMap = properties.reduce((acc, v, i) => Object.assign(acc, {
      [name + '.' + v.name]: {
        size: v.value.type === 'ArraySpecifier'
          ? ('safeMul('
            + acc[name + '.' + v.name + '.length'].slice
            + ', ' + v.value.value + ')')
          : v.value,
        offset: addValues(methodList.slice(0, i)
          .map(name => acc[name].size)),
        slice: `mslice(${addValues(['pos'].concat(methodList.slice(0, i)
          .map(name => acc[name].size)))}, ${v.value.value})`,
        method: v.value.type === 'ArraySpecifier' ?
`
function ${name + '.' + v.name}(pos, i) -> res {
  res := mslice(safeAdd(${name + '.' + v.name}.position(pos),
    safeMul(i, ${v.value.value})), ${v.value.value})
}
`
: `
function ${name + '.' + v.name}(pos) -> res {
  res := mslice(${name + '.' + v.name}.position(pos), ${v.value.value})
}
`,
        required: [
          name + '.' + v.name + '.position',
        ],
      },
      [name + '.' + v.name + '.keccak256']: {
        method: `
function ${name + '.' + v.name + '.keccak256'}(pos) -> _hash {
  _hash := keccak256(${name + '.' + v.name + '.position'}(pos), ${name + '.' + v.name + '.size'}(pos))
}
`,
        required: [
          name + '.' + v.name + '.position',
          name + '.' + v.name + '.size',
        ],
      },
      [name + '.' + v.name + '.position']: {
        method: `
function ${name + '.' + v.name + '.position'}(pos) -> _offset {
  _offset := ${addValues(['pos'].concat(methodList.slice(0, i)
    .map(name => acc[name].size)))}
}
`,
        required: [],
      },
      [name + '.' + v.name + '.offset']: {
        method: `
function ${name + '.' + v.name + '.offset'}(pos) -> _offset {
${v.value.type === 'ArraySpecifier'
  ? `_offset := safeAdd(${name + '.' + v.name + '.position(pos)'}, safeMul(${name + '.' + v.name + '.length(pos)'}, ${v.value.value}))`
  : `_offset := safeAdd(${name + '.' + v.name + '.position(pos)'}, ${v.value.value})`}
}
`,
        required: (v.value.type === 'ArraySpecifier'
          ? [name + '.' + v.name + '.length', name + '.' + v.name + '.length.position']
          : []).concat([
            name + '.' + v.name + '.position',
          ]),
      },
      [name + '.' + v.name + '.index']: {
        method: `
function ${name + '.' + v.name + '.index'}() -> _index {
  _index := ${i}
}
`,
        required: [],
      },
      [name + '.' + v.name + '.size']: {
        method: `
function ${name + '.' + v.name + '.size'}() -> _size {
  _size := ${v.value.value}
}
`,
        required: [],
      },
    }), {});
    dataMap[name + '.keccak256'] = {
      method: `
function ${name + '.keccak256'}(pos) -> _hash {
  _hash := keccak256(pos, ${name + '.size'}(pos))
}
`,
      required: [name + '.offset'],
    };
    dataMap[name + '.size'] = {
      method: `
function ${name + '.size'}(pos) -> _offset {
  _offset := safeSub(${name + '.offset'}(pos), pos)
}
`,
      required: [name + '.offset'],
    };
    dataMap[name + '.offset'] = {
      method: `
function ${name + '.offset'}(pos) -> _offset {
  _offset := ${methodList.length
  ? methodList[methodList.length - 1] + '.offset(pos)' : '0'}
}
`,
      required: methodList.length > 0
        ? [methodList[methodList.length - 1] + '.offset']
          .concat(dataMap[methodList[methodList.length - 1] + '.offset'].required)
        : [],
    };

    return {
      type: 'MemoryStructDeclaration',
      name,
      dataMap,
      value: '',
      text: '',
      line: d[2].line,
      toString: () => '',
    };
  }
%}
VariableDeclaration -> "let" _ IdentifierList _ ":=" _ Expression
ConstantDeclaration -> "const" _ IdentifierList _ ":=" _ Expression {%
  function (d) {
    // Change const to let
    d[0].value = 'let';
    d[0].text = 'let';
    d[0].type = 'Constant';
    d[0].__itendifiers = _filter(d, 'Identifier', 'equate')
      .map(v => v.value);
    d[0].__value = d[6];
    d[0].dataMap = d[0].__itendifiers.reduce((acc, v) => Object.assign(acc, {
      [v]: d[0].__value,
    }), {});
    d.__constant = true;

    return d;
  }
%}
Assignment -> IdentifierList _ ":=" _ Expression {%
  function (d) {
    d[0][0]._identifiers = _filter(d[0], 'Identifier');
    d[0][0].type = 'Assignment';
    d[0][0]._value = d[4];
    return d;
  }
%}
FunctionDefinition -> "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ "->" _ IdentifierList _ Block
  | "function" _ %Identifier _ "(" _ ")" _ "->" _ IdentifierList _ Block
  | "function" _ %Identifier _ "(" _ ")" _ "->" _ "(" _ ")" _ Block
  | "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ Block
  | "function" _ %Identifier _ "(" _ ")" _ Block
Empty -> %space
  | %multiComment
  | %singleLineComment
_ -> (Empty):*
