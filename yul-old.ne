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
      "const",
      "if", "else", "break", "continue", "default", "switch", "case"],
    Identifier: /[\w]+/,
  });
%}

@lexer lexer

Yul -> (_ Chunk):* _ {% function(d) { return d; } %}
Chunk -> Comment | ObjectDefinition | CodeDefinition {% function(d) { return d[0]; } %}
ObjectDefinition -> "object" _ %StringLiteral _ "{" ( _ objectStatement):* _ "}"
objectStatement -> CodeDefinition {% function(d) { return d[0]; } %}
  | DataDeclaration {% function(d) { return d[0]; } %}
  | ObjectDefinition {% function(d) { return d[0]; } %}
  | Comment {% function(d) { return d[0]; } %}
DataDeclaration -> "data" _ %StringLiteral _ %HexLiteral
CodeDefinition -> "code" _ "{" _ "}" {% function(d) { return null; } %}
  | "code" _ Block {% function(d) { return [d[0], d[2]]; } %}
Comment -> MultiLineComment | SingleLineComment {% id %}
MultiLineComment -> %multiComment {% id %}
SingleLineComment -> %singleLineComment {% id %}
FunctionCall -> %Identifier _ "(" _ Expression ( _ "," _ Expression):* _ ")"
  | %Identifier _ "(" _ ")"
Assignment -> %Identifier _ ":=" _ Expression
VariableDeclaration -> "let" _ IdentifierList _ ":=" _ Expression
IdentifierList -> %Identifier (_ "," _ %Identifier):* {%
  function(d) {
    const clean = d.filter(v => v);
    return [d[0]].concat(d[1][0]).filter(v => v);
  }
%}
ForLoop -> "for" _ "{" (_ Statement):* _ "}" _ Expression _ "{" (_ Statement):* _ "}" _ Block
BreakContinue -> "break" | "continue"
Switch -> "switch" _ Expression _ (_ SwitchDefinition):*
SwitchDefinition -> Case | Default
Case -> "case" _ Literal _ Block
Default -> "default" _ Block
If -> "if" _ Expression _ Block
  | "if" _ Expression _ "{" _ "}"
Literal -> %StringLiteral {% id %}
  | %NumberLiteral {% id %}
  | %HexNumber {% id %}
Expression -> Literal {% id %}
  | %Identifier {% id %}
  | FunctionCall {% id %}
FunctionDefinition -> "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ "->" _ "(" _ IdentifierList _ ")" _ Block
  | "function" _ %Identifier _ "(" _ ")" _ "->" _ "(" _ IdentifierList _ ")" _ Block
  | "function" _ %Identifier _ "(" _ ")" _ "->" _ "(" _ ")" _ Block
  | "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ "->" _ "(" _ ")" _ Block
  | "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ Block
  | "function" _ %Identifier _ "(" _ ")" _ Block
Block -> "{" (_ Statement):* _ "}" {%
  function(d) {
    return d;
  }
%}
Statement -> Expression
  | Assignment
  | VariableDeclaration
  | FunctionDefinition
  | If
  | ForLoop
  | Switch
  | Comment
_ -> null | %space {% id %}
