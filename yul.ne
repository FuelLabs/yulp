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
    StringLiteral: /"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
    ":=": ":=",
    "->": "->",
    ",": ",",
    objectKeyword: /(?:object)(?:\s)/,
    dataKeyword: /(?:data)(?:\s)/,
    bracket: ["{", "}", "(", ")"],
    keyword: ['code', 'let', "for", "function",
      "if", "else", "break", "continue", "default", "switch", "case"],
    Identifier: /[\w]+/,
  });


  function extractArray(d) {
    /* let output = [d[0], d[2]];

    for (let i in d[3]) {
      output.push(d[3]);
    } */

    return d;
  }
%}

@lexer lexer

Yul -> (_ Chunk):* _ {% function(d) { return d; } %}
Chunk -> Comment | ObjectDefinition {% function(d) { return d; } %}
ObjectDefinition -> %objectKeyword _ %StringLiteral _ "{" ( _ objectStatement):* _ "}"
objectStatement -> CodeDefinition {% function(d) { return d[0]; } %}
  | DataDeclaration {% function(d) { return d[0]; } %}
  | ObjectDefinition {% function(d) { return d[0]; } %}
  | Comment {% function(d) { return d[0]; } %}
DataDeclaration -> %dataKeyword _ %StringLiteral _ (%StringLiteral | %HexLiteral)
CodeDefinition -> "code" _ "{" _ "}" {% function(d) { return d; } %}
  | "code" _ Block
Comment -> MultiLineComment | SingleLineComment
MultiLineComment -> %multiComment
SingleLineComment -> %singleLineComment
Block -> "{" _ Statement (_ Statement):* _ "}" {% extractArray %}
  | "{" _ "}" {% extractArray %}
Switch -> "switch" _ Expression _ SwitchDefinitions
  | "switch" _ Expression _ Comment _ SwitchDefinitions
SwitchDefinitions -> SwitchDefinition (_ SwitchDefinition):* {%
  function(d) {
    const clean = d.filter(v => v);
    return d;
  }
%}
ForLoop -> "for" _ "{" (_ Statement):* _ "}" _ Expression _ "{" (_ Statement):* _ "}" _ Block
BreakContinue -> "break" | "continue"
SwitchDefinition -> Case | Default
Case -> "case" _ Literal _ Block
Default -> "default" _ Block
Statement -> Comment
  | FunctionDefinition
  | FunctionCall
  | ForLoop
  | VariableDeclaration
  | IfStatement
  | Assignment
  | Switch
IfStatement -> "if" _ Expression _ Block
  | "if" _ Expression _ "{" _ "}"
Literal -> %StringLiteral
  | %NumberLiteral
  | %HexNumber
Expression -> Literal
  | %Identifier
  | FunctionCall
FunctionCall -> %Identifier _ "(" _ Expression ( _ "," _ Expression):* _ ")"
  | %Identifier _ "(" _ ")"
Assignment -> %Identifier _ ":=" _ Expression
IdentifierList -> %Identifier (_ "," _ %Identifier):* {%
function(d) {
  const clean = d.filter(v => v);
  return [d[0]].concat(d[1][0]).filter(v => v);
}
%}
VariableDeclaration -> "let" _ IdentifierList _ ":=" _ Expression
FunctionDefinition -> "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ "->" _ IdentifierList _ Block
  | "function" _ %Identifier _ "(" _ ")" _ "->" _ IdentifierList _ Block
  | "function" _ %Identifier _ "(" _ ")" _ "->" _ "(" _ ")" _ Block
  | "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ "->" _ Block
  | "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ Block
  | "function" _ %Identifier _ "(" _ ")" _ Block
_ -> null | %space
