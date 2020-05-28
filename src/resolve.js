// Generated automatically by nearley, version 2.19.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

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
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "Page", "symbols": ["Yul"], "postprocess":  function(d) {
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
        } },
    {"name": "Yul$ebnf$1", "symbols": []},
    {"name": "Yul$ebnf$1$subexpression$1", "symbols": ["_", "Chunk"]},
    {"name": "Yul$ebnf$1", "symbols": ["Yul$ebnf$1", "Yul$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Yul", "symbols": ["Yul$ebnf$1", "_"], "postprocess": function(d) { return d; }},
    {"name": "Chunk", "symbols": ["ObjectDefinition"]},
    {"name": "Chunk", "symbols": ["CodeDefinition"]},
    {"name": "Chunk", "symbols": ["ImportStatement"], "postprocess": function(d) { return d; }},
    {"name": "Imports$ebnf$1", "symbols": []},
    {"name": "Imports$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)]},
    {"name": "Imports$ebnf$1", "symbols": ["Imports$ebnf$1", "Imports$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Imports", "symbols": [(lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral), "Imports$ebnf$1"], "postprocess": function (d) { return d; }},
    {"name": "ImportStatement", "symbols": [{"literal":"import"}, "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)], "postprocess":  function(d) {
          const file = d[2].value.slice(1, -1);
        
          return {
            value: '',
            text: '',
            file,
            type: 'ImportStatement',
          };
        } },
    {"name": "ObjectList$ebnf$1", "symbols": []},
    {"name": "ObjectList$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)]},
    {"name": "ObjectList$ebnf$1", "symbols": ["ObjectList$ebnf$1", "ObjectList$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ObjectList", "symbols": [(lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral), "ObjectList$ebnf$1"], "postprocess":  function(d) {
          return _filter(d, 'StringLiteral').map((v, i) => ({
            type: 'ObjectExtends',
            value: '',
            text: '',
            name: v.value.slice(1, -1),
          }));
        } },
    {"name": "ObjectIs", "symbols": [{"literal":"is"}], "postprocess": 
        function (d) {
          return { value: '', text: '', toString: () => {} };
        }
        },
    {"name": "ObjectDefinition$subexpression$1$subexpression$1", "symbols": [(lexer.has("objectKeyword") ? {type: "objectKeyword"} : objectKeyword), "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)]},
    {"name": "ObjectDefinition$subexpression$1", "symbols": ["ObjectDefinition$subexpression$1$subexpression$1"]},
    {"name": "ObjectDefinition$subexpression$1$subexpression$2", "symbols": [(lexer.has("objectKeyword") ? {type: "objectKeyword"} : objectKeyword), "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral), "_", "ObjectIs", "_", "ObjectList"]},
    {"name": "ObjectDefinition$subexpression$1", "symbols": ["ObjectDefinition$subexpression$1$subexpression$2"]},
    {"name": "ObjectDefinition$ebnf$1", "symbols": []},
    {"name": "ObjectDefinition$ebnf$1$subexpression$1", "symbols": ["_", "objectStatement"]},
    {"name": "ObjectDefinition$ebnf$1", "symbols": ["ObjectDefinition$ebnf$1", "ObjectDefinition$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ObjectDefinition", "symbols": ["ObjectDefinition$subexpression$1", "_", {"literal":"{"}, "ObjectDefinition$ebnf$1", "_", {"literal":"}"}], "postprocess": 
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
        },
    {"name": "objectStatement", "symbols": ["CodeDefinition"]},
    {"name": "objectStatement", "symbols": ["DataDeclaration"]},
    {"name": "objectStatement", "symbols": ["ObjectDefinition"]},
    {"name": "DataDeclaration$subexpression$1", "symbols": [(lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)]},
    {"name": "DataDeclaration$subexpression$1", "symbols": [(lexer.has("HexLiteral") ? {type: "HexLiteral"} : HexLiteral)]},
    {"name": "DataDeclaration", "symbols": [(lexer.has("dataKeyword") ? {type: "dataKeyword"} : dataKeyword), "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral), "_", "DataDeclaration$subexpression$1"]},
    {"name": "CodeDefinition", "symbols": [(lexer.has("codeKeyword") ? {type: "codeKeyword"} : codeKeyword), "_", "Block"], "postprocess": 
        function (d) {
          d[2][0].code = d[2].slice(1, -1);
          d[2][0].isCodeBlock = true;
          return d;
        }
        },
    {"name": "Block$ebnf$1", "symbols": []},
    {"name": "Block$ebnf$1$subexpression$1", "symbols": ["_", "Statement"]},
    {"name": "Block$ebnf$1", "symbols": ["Block$ebnf$1", "Block$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Block", "symbols": [{"literal":"{"}, "_", "Statement", "Block$ebnf$1", "_", {"literal":"}"}]},
    {"name": "Block", "symbols": [{"literal":"{"}, "_", {"literal":"}"}]},
    {"name": "Switch", "symbols": [{"literal":"switch"}, "_", "Expression", "_", "SwitchDefinitions"]},
    {"name": "SwitchDefinitions$ebnf$1", "symbols": []},
    {"name": "SwitchDefinitions$ebnf$1$subexpression$1", "symbols": ["_", "SwitchDefinition"]},
    {"name": "SwitchDefinitions$ebnf$1", "symbols": ["SwitchDefinitions$ebnf$1", "SwitchDefinitions$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "SwitchDefinitions", "symbols": ["SwitchDefinition", "SwitchDefinitions$ebnf$1"]},
    {"name": "MAX_UINT", "symbols": [(lexer.has("MAX_UINTLiteral") ? {type: "MAX_UINTLiteral"} : MAX_UINTLiteral)]},
    {"name": "ErrorLiteral", "symbols": [(lexer.has("ErrorLiteral") ? {type: "ErrorLiteral"} : ErrorLiteral)]},
    {"name": "SigLiteral", "symbols": [(lexer.has("SigLiteral") ? {type: "SigLiteral"} : SigLiteral)]},
    {"name": "TopicLiteral", "symbols": [(lexer.has("TopicLiteral") ? {type: "TopicLiteral"} : TopicLiteral)]},
    {"name": "Boolean", "symbols": [(lexer.has("boolean") ? {type: "boolean"} : boolean)]},
    {"name": "EnumDeclaration", "symbols": [{"literal":"enum"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}]},
    {"name": "EnumDeclaration", "symbols": [{"literal":"enum"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "IdentifierList", "_", {"literal":")"}]},
    {"name": "ForLoop$ebnf$1", "symbols": []},
    {"name": "ForLoop$ebnf$1$subexpression$1", "symbols": ["_", "Statement"]},
    {"name": "ForLoop$ebnf$1", "symbols": ["ForLoop$ebnf$1", "ForLoop$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ForLoop$ebnf$2", "symbols": []},
    {"name": "ForLoop$ebnf$2$subexpression$1", "symbols": ["_", "Statement"]},
    {"name": "ForLoop$ebnf$2", "symbols": ["ForLoop$ebnf$2", "ForLoop$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ForLoop", "symbols": [{"literal":"for"}, "_", {"literal":"{"}, "ForLoop$ebnf$1", "_", {"literal":"}"}, "_", "Expression", "_", {"literal":"{"}, "ForLoop$ebnf$2", "_", {"literal":"}"}, "_", "Block"]},
    {"name": "BreakContinue", "symbols": [{"literal":"break"}]},
    {"name": "BreakContinue", "symbols": [{"literal":"continue"}]},
    {"name": "SwitchDefinition", "symbols": ["Case"]},
    {"name": "SwitchDefinition", "symbols": ["Default"]},
    {"name": "CaseLiteral", "symbols": ["Literal"]},
    {"name": "CaseLiteral", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier)]},
    {"name": "Case", "symbols": [{"literal":"case"}, "_", "CaseLiteral", "_", "Block"]},
    {"name": "Default", "symbols": [{"literal":"default"}, "_", "Block"]},
    {"name": "Statement", "symbols": ["FunctionDefinition"]},
    {"name": "Statement", "symbols": ["FunctionCall"]},
    {"name": "Statement", "symbols": ["ForLoop"]},
    {"name": "Statement", "symbols": ["VariableDeclaration"]},
    {"name": "Statement", "symbols": ["ConstantDeclaration"]},
    {"name": "Statement", "symbols": ["MemoryStructDeclaration"]},
    {"name": "Statement", "symbols": ["EnumDeclaration"]},
    {"name": "Statement", "symbols": ["IfStatement"]},
    {"name": "Statement", "symbols": ["Assignment"]},
    {"name": "Statement", "symbols": ["Switch"]},
    {"name": "Statement", "symbols": ["BreakContinue"]},
    {"name": "Statement", "symbols": ["Block"]},
    {"name": "IfStatement", "symbols": [{"literal":"if"}, "_", "Expression", "_", "Block"]},
    {"name": "NumericLiteral", "symbols": [(lexer.has("NumberLiteral") ? {type: "NumberLiteral"} : NumberLiteral)]},
    {"name": "NumericLiteral", "symbols": [(lexer.has("HexNumber") ? {type: "HexNumber"} : HexNumber)]},
    {"name": "NumericLiteral", "symbols": ["SigLiteral"]},
    {"name": "NumericLiteral", "symbols": ["ErrorLiteral"]},
    {"name": "NumericLiteral", "symbols": ["TopicLiteral"]},
    {"name": "Literal", "symbols": [(lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)]},
    {"name": "Literal", "symbols": ["NumericLiteral"]},
    {"name": "Literal", "symbols": ["MAX_UINT"]},
    {"name": "Expression", "symbols": ["Literal"]},
    {"name": "Expression", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier)]},
    {"name": "Expression", "symbols": ["FunctionCall"]},
    {"name": "Expression", "symbols": ["Boolean"]},
    {"name": "ExpressionList$ebnf$1", "symbols": []},
    {"name": "ExpressionList$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "Expression"]},
    {"name": "ExpressionList$ebnf$1", "symbols": ["ExpressionList$ebnf$1", "ExpressionList$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ExpressionList", "symbols": [{"literal":"("}, "_", "Expression", "ExpressionList$ebnf$1", "_", {"literal":")"}]},
    {"name": "FunctionCall", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", "ExpressionList"]},
    {"name": "FunctionCall", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}]},
    {"name": "ArraySpecifier", "symbols": [{"literal":"["}, "_", "NumericLiteral", "_", {"literal":"]"}]},
    {"name": "StructIdentifier", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier)]},
    {"name": "IdentifierList$ebnf$1", "symbols": []},
    {"name": "IdentifierList$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier)]},
    {"name": "IdentifierList$ebnf$1", "symbols": ["IdentifierList$ebnf$1", "IdentifierList$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "IdentifierList", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "IdentifierList$ebnf$1"]},
    {"name": "MemoryStructIdentifier$subexpression$1", "symbols": ["StructIdentifier"]},
    {"name": "MemoryStructIdentifier$subexpression$1", "symbols": ["NumericLiteral"]},
    {"name": "MemoryStructIdentifier$subexpression$1", "symbols": ["ArraySpecifier"]},
    {"name": "MemoryStructIdentifier", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":":"}, "_", "MemoryStructIdentifier$subexpression$1"]},
    {"name": "MemoryStructList$ebnf$1", "symbols": []},
    {"name": "MemoryStructList$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "MemoryStructIdentifier"]},
    {"name": "MemoryStructList$ebnf$1", "symbols": ["MemoryStructList$ebnf$1", "MemoryStructList$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "MemoryStructList", "symbols": ["MemoryStructIdentifier", "MemoryStructList$ebnf$1"]},
    {"name": "MemoryStructDeclaration", "symbols": [{"literal":"mstruct"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}]},
    {"name": "MemoryStructDeclaration", "symbols": [{"literal":"mstruct"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "MemoryStructList", "_", {"literal":")"}]},
    {"name": "VariableDeclaration", "symbols": [{"literal":"let"}, "_", "IdentifierList", "_", {"literal":":="}, "_", "Expression"]},
    {"name": "ConstantDeclaration", "symbols": [(lexer.has("ConstIdentifier") ? {type: "ConstIdentifier"} : ConstIdentifier), "_", "IdentifierList", "_", {"literal":":="}, "_", "Expression"]},
    {"name": "Assignment", "symbols": ["IdentifierList", "_", {"literal":":="}, "_", "Expression"]},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "IdentifierList", "_", {"literal":")"}, "_", {"literal":"->"}, "_", "IdentifierList", "_", "Block"]},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}, "_", {"literal":"->"}, "_", "IdentifierList", "_", "Block"]},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}, "_", {"literal":"->"}, "_", {"literal":"("}, "_", {"literal":")"}, "_", "Block"]},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "IdentifierList", "_", {"literal":")"}, "_", "Block"]},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}, "_", "Block"]},
    {"name": "Empty", "symbols": [(lexer.has("space") ? {type: "space"} : space)]},
    {"name": "Empty", "symbols": [(lexer.has("multiComment") ? {type: "multiComment"} : multiComment)]},
    {"name": "Empty", "symbols": [(lexer.has("singleLineComment") ? {type: "singleLineComment"} : singleLineComment)]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1$subexpression$1", "symbols": ["Empty"]},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "_$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"]}
]
  , ParserStart: "Page"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
