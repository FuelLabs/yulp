@{%
  const moo = require('moo')
  const { utils } = require('ethers');
  function id(x) {return x[0]; }

  let lexer = moo.compile({
    space: { match: /\s+/, lineBreaks: true },
    singleLineComment: /\/\/.*?$/,
    multiComment: /\/\*[\s\S]*?\*\/|(?:[^\\:]|^)\/\/.*$/,
    NumberLiteral: /(?!0x)[0-9]+/,
    HexLiteral: /(?:hex)(?:"|')[0-9a-fA-F]+(?:"|')/,
    HexNumber: /0[x][0-9a-fA-F]+/,
    StringLiteral: /(?:"|').*(?:"|')/,
    SigLiteral: /(?:sig)(?:"|').*(?:"|')/,
    TopicLiteral: /(?:topic)(?:"|').*(?:"|')/,
    ":=": ":=",
    "->": "->",
    ",": ",",
    ":": ":",
    ".": ".",
    codeLiteral: 'code',
    boolean: ["true", "false"],
    bracket: ["{", "}", "(", ")"],
    keyword: ["object", 'let', "for", "function", "data",
      "const", "enum", "mstruct",
      "if", "else", "break", "continue", "default", "switch", "case"],
    Identifier: /(?![.])[\w.]+/,
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
%}

@lexer lexer

Yul -> (_ Chunk):* _ {% function(d) { return d; } %}
Chunk -> Comment | ObjectDefinition {% function(d) { return d[0]; } %}
ObjectDefinition -> "object" _ %StringLiteral _ "{" ( _ ObjectStatement):* _ "}" {% function(d) { console.log(d); return d; } %}
ObjectStatement -> CodeDefinition {% function(d) { return d[0]; } %}
  | DataDeclaration {% function(d) { return d[0]; } %}
  | ObjectDefinition {% function(d) { return d[0]; } %}
  | Comment {% function(d) { return d[0]; } %}
DataDeclaration -> "data" _ (_ | %StringLiteral) _ ( %HexLiteral | %StringLiteral )
CodeDefinition -> "code" _ "{" _ "}" {% function(d) { return null; } %}
  | "code" _ Block {% function(d) { return null; } %}
Comment -> MultiLineComment | SingleLineComment {% id %}
Boolean -> %boolean {% function(d) {
  if (d[0].value === "true") {
    return { type: 'HexNumber', value: '0x01', text: '0x01' };
  } else {
    return { type: 'HexNumber', value: '0x00', text: '0x00' };
  }
} %}
SigLiteral -> %SigLiteral {%
  function(d) {
    const sig = stringToSig(d[0].value.trim().slice(4).slice(0, -1));
    return { type: 'HexNumber', value: sig, text: sig };
  }
%}
TopicLiteral -> %TopicLiteral {%
  function(d) {
    const sig = stringToSig(d[0].value.trim().slice(4).slice(0, -1));
    return { type: 'HexNumber', value: sig, text: sig };
  }
%}
MultiLineComment -> %multiComment {% id %}
SingleLineComment -> %singleLineComment {% id %}
FunctionCall -> %Identifier _ "(" _ Expression ( _ "," _ Expression):* _ ")" {% FunctionCall %}
  | %Identifier _ "(" _ Expression ( _ "," _ Expression):* _ ")" "." _ %Identifier {% FunctionCall %}
  | %Identifier _ "(" _ ")" {% FunctionCall %}
  | %Identifier _ "(" _ ")" "." _ %Identifier {% FunctionCall %}
Assignment -> %Identifier _ ":=" _ Expression
VariableDeclaration -> "let" _ IdentifierList _ ":=" _ Expression
ConstantDeclaration -> "const" _ %Identifier _ ":=" _ Literal {%
  function(d) {
    const clean = d.filter(v => v.type !== 'space' && v.type !== 'keyword');
    return { type: 'constant', name: clean[0], value: clean[2] };
  }
%}
EnumDeclaration -> "enum" _ %Identifier _ "(" IdentifierList _ ")" {%
  function(d) {
    const clean = flatDeep(d, Infinity)
      .filter(v => v.type === 'Identifier');
    const enumName = clean[0].value;
    const vals = clean.slice(1);

    return vals.map((enumValue, enumIndex) => ({
      type: 'constant',
      name: {
        type: 'Identifier',
        value: enumName + '.' + enumValue.value,
        text: enumName + '.' + enumValue.value,
      },
      value: {
        type: 'NumberLiteral',
        value: String(enumIndex),
        text: String(enumIndex),
      },
    }));
  }
%}
MemoryStructDeclaration -> "mstruct" _ %Identifier _ "(" _ MemoryStructExpression (_ "," _ MemoryStructExpression):* _ ")" {%
  function(d) {
    const clean = flatDeep(d, Infinity)
      .filter(v => v.type === 'Identifier' || v.type === 'NumberLiteral' || v.type === 'HexNumber');
    const mstructName = clean[0].value;
    const propNames = clean.slice(1).filter(v => v.type === 'Identifier');
    const propValues = clean.slice(1).filter(v => v.type === 'NumberLiteral' || v.type === 'HexNumber');
    const propValuesBN = propValues
      .map(v => utils.bigNumberify(v.value));

    // Check value sizes
    for (var i = 0; i < propValuesBN.length; i++) {
      if (propValuesBN[i].gt(utils.bigNumberify(32))) {
        throw new Error('Invalid memory structure declaration: "' + propValues[i].value + '" greater than 32 in ' + mstructName);
      }
    }
    const zero = utils.bigNumberify(0);
    const length = propValuesBN.reduce((a, b) => a.add(b), zero);

    const offsets = propValuesBN.map((v, i) => propValuesBN.slice(0, i).reduce((a, b) => a.add(b), zero))
    const props = propNames.reduce((acc, v, i) => Object.assign(acc, {
      [v]: {
        value: propValues[i],
        offset: {
          type: 'HexNumber',
          text: offsets[i].toHexString(),
          value: offsets[i].toHexString(),
        }
      },
    }), {});
    let methods = propNames.map((name, i) => `
function ${mstructName}___${name}(position) -> result {
  result := div(mload(add(position, ${offsets[i].toHexString()})), exp(2, safeSub(256, safeMul(${propValuesBN[i].toHexString()}, 8))))
}
`);
    methods += `
      function ${mstructName}(position) -> result {
        result := position
      }
    `;

    return propNames.map((structProp, propIndex) => ({
      type: 'constant',
      name: {
        type: 'Identifier',
        value: mstructName + '.' + structProp.value,
        text: mstructName + '.' + structProp.value,
      },
      value: propValues[propIndex],
    }))
    .concat([
      {
        type: 'constant',
        name: {
          type: 'Identifier',
          value: mstructName + '.' + 'size',
          text: mstructName + '.' + 'size',
        },
        value: {
          type: 'HexNumber',
          value: length.toHexString(),
          text: length.toHexString(),
        },
      },
      {
        type: 'MemoryStructure',
        value: methods,
        name: mstructName,
        props,
      }
    ]);
  }
%}
MemoryStructExpression -> %Identifier _ ":" _ Literal
IdentifierList -> %Identifier (_ "," _ %Identifier):*
ForLoop -> "for" _ "{" (_ Statement):* _ "}" _ Expression _ "{" (_ Statement):* _ "}" _ Block
BreakContinue -> "break" | "continue"
Switch -> "switch" _ Expression _ (_ SwitchDefinition):*
  | "switch" _ Expression _ Comment _ (_ SwitchDefinition):*
SwitchDefinition -> Case | Default
Case -> "case" _ CaseExpression _ Block
CaseExpression -> Literal | %Identifier
Default -> "default" _ Block
If -> "if" _ Expression _ Block
  | "if" _ Expression _ "{" _ "}"
Literal -> %StringLiteral {% id %}
  | %NumberLiteral {% id %}
  | %HexNumber {% id %}
  | Boolean
  | SigLiteral
  | TopicLiteral
Expression -> Literal {% id %}
  | %Identifier {% id %}
  | FunctionCall {% id %}
  | Comment {% id %}
FunctionDefinition -> "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ "->" _ "(" _ IdentifierList _ ")" _ Block
  | "function" _ %Identifier _ "(" _ ")" _ "->" _ "(" _ IdentifierList _ ")" _ Block
  | "function" _ %Identifier _ "(" _ ")" _ "->" _ "(" _ ")" _ Block
  | "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ "->" _ "(" _ ")" _ Block
  | "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ Block
  | "function" _ %Identifier _ "(" _ ")" _ Block
Block -> "{" (_ Statement):* _ "}" {%
  function(d) {
    const constants = allConstants(d);
    const structs = allMemoryStructs(d);

    return replaceOutMemoryStructs(replaceOutConstants(d, constants), structs);
  }
%}
Statement -> Expression
  | Assignment
  | VariableDeclaration
  | ConstantDeclaration
  | FunctionDefinition
  | EnumDeclaration
  | MemoryStructDeclaration
  | If
  | ForLoop
  | Switch
  | Comment
_ -> null | %space {% id %}
@{%

function FunctionCall(d) {
  const clean = d.filter(v => v.type !== 'space' && v.type !== 'keyword');
  let property = null;

  // Appendage Property
  if (clean.slice(-1)[0].type === 'Identifier') {
    property = clean[clean.length - 1].value;
    clean[clean.length - 1] = {
      type: 'space',
      value: '',
      text: '',
    };
    clean[clean.length - 2] = {
      type: 'space',
      value: '',
      text: '',
    };
    clean[clean.length - 3] = {
      type: 'space',
      value: '',
      text: '',
    };
  }

  Object.assign(clean[0], {
    type: 'FunctionCallIdentifier',
    name: clean[0].value,
    property: property,
    value: clean[0].value,
    text:  clean[0].text,
  });

  return clean;
}

function flatDeep(arr, d = 1) {
   return d > 0 ? arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val, d - 1) : val), [])
                : arr.slice();
};

const allConstants = arr => flatDeep(arr, Infinity)
  .filter(v => v.type === 'constant')
  .reduce((acc, v) => Object.assign(acc, { [v.name.value]: v }), {});

const replaceOutConstants = (arr, constants) => arr
  .map(v => Array.isArray(v) ? replaceOutConstants(v, constants)
    : (v.type === 'Identifier' && constants[v.value] ? constants[v.value].value : (
      v.type === 'constant' ? '' : v
    )));

const allMemoryStructs = arr => flatDeep(arr, Infinity)
  .filter(v => v.type === 'MemoryStructure')
  .reduce((acc, v) => Object.assign(acc, { [v.name]: v }), {});

const replaceOutMemoryStructs = (arr, structs) => arr
  .map(v => Array.isArray(v) ? replaceOutMemoryStructs(v, structs)
    : (v.type === 'FunctionCallIdentifier' && structs[v.value]
      ? (v.property ? { value: v.value + '___' + v.property } : { value: v.value })
    : v));
%}
