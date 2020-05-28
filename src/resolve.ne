@{%
  const moo = require('moo')
  const { utils } = require('ethers');
  const clone = require('rfdc')() // Returns the deep copy function

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
    MAX_UINTLiteral: /(?:MAX_UINT)/,
    SigLiteral: /(?:sig)"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
    TopicLiteral: /(?:topic)"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
    ErrorLiteral: /(?:error)"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
    codeKeyword: /(?:code)(?:\s)/,
    objectKeyword: /(?:object)(?:\s)/,
    dataKeyword: /(?:data)(?:\s)/,
    boolean: ["true", "false"],
    bracket: ["{", "}", "(", ")", '[', ']'],
    ConstIdentifier: /(?:const)(?:\s)/,
    keyword: ['code ', 'let', "for", "function", "enum", "mstruct", "if", "else", "break", "continue", "default", "switch", "case"],
    Identifier: /[\w.]+/,
  });

  let objects = {};
%}

@lexer lexer

Page -> Yul {% function(d) {
  return mapDeep(d, v => {
    if (v.isCodeBlock) {
      let includes = [];
      objects[v.objectName] = {
        code: v.code,
        extends: v.objectExtends,
      };

      const includeit = arr => {
        arr.map(a => {
          if (includes.indexOf(a) === -1) {
            includeit(objects[a].extends);

            if (includes.indexOf(a) === -1) {
              includes.push(a);
            }
          }
        });
      };
      includeit(v.objectExtends);

      v.value = print([{ value: '{' }].concat(includes.map(v => objects[v].code)));
    }

    return v;
  });
} %}
Yul -> (_ Chunk):* _ {% function(d) { return d; } %}
Chunk -> ObjectDefinition | CodeDefinition | ImportStatement {% function(d) { return d; } %}
Imports -> %StringLiteral (_ "," _ %StringLiteral):* {% function (d) { return d; } %}
ImportStatement -> "import" _ %StringLiteral {% function(d) {
  const file = d[2].value.slice(1, -1);

  return {
    value: '',
    text: '',
    file,
    type: 'ImportStatement',
  };
} %}
ObjectList -> %StringLiteral (_ "," _ %StringLiteral):* {% function(d) {
  return _filter(d, 'StringLiteral').map((v, i) => ({
    type: 'ObjectExtends',
    value: '',
    text: '',
    name: v.value.slice(1, -1),
  }));
} %}
ObjectIs -> "is" {%
  function (d) {
    return { value: '', text: '', toString: () => {} };
  }
%}
ObjectDefinition -> ((%objectKeyword _ %StringLiteral)
  | (%objectKeyword _ %StringLiteral _ ObjectIs _ ObjectList)) _ "{" ( _ objectStatement):* _ "}" {%
  function (d) {
    let obj = null;

    const _extends = _filter(d[0][0], 'ObjectExtends').map(v => v.name);
    const name = _filter(d[0][0], 'StringLiteral')[0].value.slice(1, -1);

    return mapDeep(d, m => {
      if (obj === null && m.isCodeBlock) {
        m.objectName = name;
        m.objectExtends = _extends;
        obj = true;
      }

      return m;
    });
  }
%}
objectStatement -> CodeDefinition
  | DataDeclaration
  | ObjectDefinition
DataDeclaration -> %dataKeyword _ %StringLiteral _ (%StringLiteral | %HexLiteral)
CodeDefinition -> %codeKeyword _ Block {%
  function (d) {
    d[2][0].code = d[2].slice(1, -1);
    d[2][0].isCodeBlock = true;
    return d;
  }
%}
Block -> "{" _ Statement (_ Statement):* _ "}"
  | "{" _ "}"
Switch -> "switch" _ Expression _ SwitchDefinitions
SwitchDefinitions -> SwitchDefinition (_ SwitchDefinition):*
MAX_UINT -> %MAX_UINTLiteral
ErrorLiteral -> %ErrorLiteral
SigLiteral -> %SigLiteral
TopicLiteral -> %TopicLiteral
Boolean -> %boolean
EnumDeclaration -> "enum" _ %Identifier _ "(" _ ")"
  | "enum" _ %Identifier _ "(" _ IdentifierList _ ")"
ForLoop -> "for" _ "{" (_ Statement):* _ "}" _ Expression _ "{" (_ Statement):* _ "}" _ Block
BreakContinue -> "break" | "continue"
SwitchDefinition -> Case | Default
CaseLiteral -> Literal | %Identifier
Case -> "case" _ CaseLiteral _ Block
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
  | Block
IfStatement -> "if" _ Expression _ Block
NumericLiteral -> %NumberLiteral
  | %HexNumber
  | SigLiteral
  | ErrorLiteral
  | TopicLiteral
Literal -> %StringLiteral
  | NumericLiteral
  | MAX_UINT
Expression -> Literal
  | %Identifier
  | FunctionCall
  | Boolean
ExpressionList -> "(" _ Expression ( _ "," _ Expression):* _ ")"
FunctionCall -> %Identifier _ ExpressionList
  | %Identifier _ "(" _ ")"
ArraySpecifier -> "[" _ NumericLiteral _ "]"
StructIdentifier -> %Identifier
IdentifierList -> %Identifier (_ "," _ %Identifier):*
MemoryStructIdentifier -> %Identifier _ ":" _ ( StructIdentifier | NumericLiteral | ArraySpecifier )
MemoryStructList -> MemoryStructIdentifier (_ "," _ MemoryStructIdentifier):*
MemoryStructDeclaration -> "mstruct" _ %Identifier _ "(" _ ")"
  | "mstruct" _ %Identifier _ "(" _ MemoryStructList _ ")"
VariableDeclaration -> "let" _ IdentifierList _ ":=" _ Expression
ConstantDeclaration -> %ConstIdentifier _ IdentifierList _ ":=" _ Expression
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
