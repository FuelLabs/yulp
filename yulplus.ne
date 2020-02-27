@{%
  const moo = require('moo')
  const { utils } = require('ethers');
  function id(x) { return x[0]; }

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
    codeKeyword: /(?:code)(?:\s)/,
    objectKeyword: /(?:object)(?:\s)/,
    dataKeyword: /(?:data)(?:\s)/,
    bracket: ["{", "}", "(", ")"],
    keyword: ['code', 'let', "for", "function", "const",
      "if", "else", "break", "continue", "default", "switch", "case"],
    Identifier: /[\w]+/,
  });

  function flatDeep(arr, d = 1) {
     return d > 0 ? arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val, d - 1) : val), [])
                  : arr.slice();
  };

  function mapDeep(arr, f) {
    return Array.isArray(arr) ? arr.map(v => mapDeep(v, f)) : f(arr);
  }

  function _filter(arr, kind, stopKind = null) {
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

  function extractArray(d) {
    return d;
  }
%}

@lexer lexer

Yul -> (_ Chunk):* _ {% function(d) { return d; } %}
Chunk -> ObjectDefinition | CodeDefinition {% function(d) { return d; } %}
ObjectDefinition -> %objectKeyword _ %StringLiteral _ "{" ( _ objectStatement):* _ "}"
objectStatement -> CodeDefinition {% function(d) { return d[0]; } %}
  | DataDeclaration {% function(d) { return d[0]; } %}
  | ObjectDefinition {% function(d) { return d[0]; } %}
DataDeclaration -> %dataKeyword _ %StringLiteral _ (%StringLiteral | %HexLiteral)
CodeDefinition -> %codeKeyword _ Block
Block -> "{" _ Statement (_ Statement):* _ "}" {% function(d) {
  const constants = _filter(d, '__constant');

  return mapDeep(d, v => {
    if (v.kind === 'ExpressionValue') {

    }

    return v;
  });
} %}
  | "{" _ "}" {% extractArray %}
Switch -> "switch" _ Expression _ SwitchDefinitions
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
Statement -> FunctionDefinition
  | FunctionCall
  | ForLoop
  | VariableDeclaration
  | ConstantDeclaration
  | IfStatement
  | Assignment
  | Switch
  | BreakContinue
IfStatement -> "if" _ Expression _ Block
Literal -> %StringLiteral
  | %NumberLiteral
  | %HexNumber
Expression -> Literal {% stateKind('ExpressionValue') %}
  | %Identifier {% stateKind('ExpressionValue') %}
  | FunctionCall {% stateKind('ExpressionValue') %}
FunctionCall -> %Identifier _ "(" _ Expression ( _ "," _ Expression):* _ ")"
  | %Identifier _ "(" _ ")"
IdentifierList -> %Identifier (_ "," _ %Identifier):* {% extractArray %}
VariableDeclaration -> "let" _ IdentifierList _ ":=" _ Expression
ConstantDeclaration -> "const" _ IdentifierList _ ":=" _ Expression {%
  function (d) {
    // Change const to let
    d[0].value = 'let';
    d[0].text = 'let';
    d[0].type = '__constant';
    d[0].__itendifiers = _filter(d, 'Identifier', 'equate')
      .map(v => v.value);
    d[0].__value = _filterKind(d, 'ExpressionValue');
    d.__constant = true;

    return d;
  }
%}
Assignment -> IdentifierList _ ":=" _ Expression
FunctionDefinition -> "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ "->" _ IdentifierList _ Block
  | "function" _ %Identifier _ "(" _ ")" _ "->" _ IdentifierList _ Block
  | "function" _ %Identifier _ "(" _ ")" _ "->" _ "(" _ ")" _ Block
  | "function" _ %Identifier _ "(" _ IdentifierList _ ")" _ Block
  | "function" _ %Identifier _ "(" _ ")" _ Block
Empty -> %space
  | %multiComment
  | %singleLineComment
_ -> (Empty):*
