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
    ":=": ":=",
    "->": "->",
    ",": ",",
    bracket: ["{", "}", "(", ")"],
    keyword: ['object', 'code', 'let', "for", "function", "data",
      "if", "else", "break", "continue", "default", "switch", "case"],
    Identifier: /[\w]+/,
  });


  function extractArray(d) {
    let output = [d[0], d[2]];

    for (let i in d[3]) {
      output.push(d[3][i][3]);
    }

    return output;
  }
%}

@lexer lexer

Yul -> (_ Chunk):* _ {% function(d) { return d; } %}
Chunk -> Comment | ObjectDefinition {% function(d) { return d[0]; } %}
ObjectDefinition -> "object" _ %StringLiteral _ "{" ( _ objectStatement):* _ "}"
objectStatement -> CodeDefinition {% function(d) { return d[0]; } %}
  | DataDeclaration {% function(d) { return d[0]; } %}
  | ObjectDefinition {% function(d) { return d[0]; } %}
  | Comment {% function(d) { return d[0]; } %}
DataDeclaration -> "data" _ %StringLiteral _ %HexLiteral
CodeDefinition -> "code" _ "{" _ "}" {% function(d) { return d; } %}
  | "code" _ Block
Comment -> MultiLineComment | SingleLineComment {% id %}
MultiLineComment -> %multiComment {% id %}
SingleLineComment -> %singleLineComment {% id %}
Block -> "{" _ Statement (_ Statement):* _ "}" {% extractArray %}
Statement -> Comment
_ -> null | %space {% id %}
