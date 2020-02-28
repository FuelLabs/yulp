// Generated automatically by nearley, version 2.19.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

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

  function mapDeep(arr, f) {
    return Array.isArray(arr) ? arr.map(v => mapDeep(v, f)) : f(arr);
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
    return d;
  }

  function extractArray(d) {
    return d;
  }

  // add(0, 1)
  // add(0, add(2, 3))
  // add(0, add(3, add(4, 2)))

  function addValues(vals) {
    return vals
      .map(v => `add(${v.value || v}, `)
      .concat(['0'])
      .concat(Array(vals.length).fill(')'))
      .join('');
  }

  const sliceMethod = `function mslice(position, length) -> result {
      if gt(length, 32) { revert(0, 0) } // protect against overflow

      result := div(mload(position), exp(2, safeSub(256, safeMul(length, 8))))
  }`;
  const sliceObject = {
    value: sliceMethod,
    text: sliceMethod,
    type: 'MethodInjection',
    toString: () => sliceMethod,
  };
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "Yul$ebnf$1", "symbols": []},
    {"name": "Yul$ebnf$1$subexpression$1", "symbols": ["_", "Chunk"]},
    {"name": "Yul$ebnf$1", "symbols": ["Yul$ebnf$1", "Yul$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Yul", "symbols": ["Yul$ebnf$1", "_"], "postprocess": function(d) { return d; }},
    {"name": "Chunk", "symbols": ["ObjectDefinition"]},
    {"name": "Chunk", "symbols": ["CodeDefinition"], "postprocess": function(d) { return d; }},
    {"name": "ObjectDefinition$ebnf$1", "symbols": []},
    {"name": "ObjectDefinition$ebnf$1$subexpression$1", "symbols": ["_", "objectStatement"]},
    {"name": "ObjectDefinition$ebnf$1", "symbols": ["ObjectDefinition$ebnf$1", "ObjectDefinition$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ObjectDefinition", "symbols": [(lexer.has("objectKeyword") ? {type: "objectKeyword"} : objectKeyword), "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral), "_", {"literal":"{"}, "ObjectDefinition$ebnf$1", "_", {"literal":"}"}]},
    {"name": "objectStatement", "symbols": ["CodeDefinition"], "postprocess": function(d) { return d[0]; }},
    {"name": "objectStatement", "symbols": ["DataDeclaration"], "postprocess": function(d) { return d[0]; }},
    {"name": "objectStatement", "symbols": ["ObjectDefinition"], "postprocess": function(d) { return d[0]; }},
    {"name": "DataDeclaration$subexpression$1", "symbols": [(lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)]},
    {"name": "DataDeclaration$subexpression$1", "symbols": [(lexer.has("HexLiteral") ? {type: "HexLiteral"} : HexLiteral)]},
    {"name": "DataDeclaration", "symbols": [(lexer.has("dataKeyword") ? {type: "dataKeyword"} : dataKeyword), "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral), "_", "DataDeclaration$subexpression$1"]},
    {"name": "CodeDefinition", "symbols": [(lexer.has("codeKeyword") ? {type: "codeKeyword"} : codeKeyword), "_", "Block"], "postprocess": 
        function (d) {
          // Inject slice method
          const usesSlice = _filter(d, 'FunctionCallIdentifier')
            .filter(v => v.value === 'mslice')
            .length > 0;
          d[2].splice(1, 0, sliceObject);
        
          return d;
        }
        },
    {"name": "Block$ebnf$1", "symbols": []},
    {"name": "Block$ebnf$1$subexpression$1", "symbols": ["_", "Statement"]},
    {"name": "Block$ebnf$1", "symbols": ["Block$ebnf$1", "Block$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Block", "symbols": [{"literal":"{"}, "_", "Statement", "Block$ebnf$1", "_", {"literal":"}"}], "postprocess":  function(d) {
          // Scan for enums and constant declarations
          const enums = _filter(d, 'Enum')
            .reduce((acc, v) => Object.assign(acc, v.dataMap), {});
          const constants = _filter(d, 'Constant')
            .reduce((acc, v) => Object.assign(acc, v.dataMap), {});
          const mstructs = _filter(d, 'MemoryStructDeclaration')
            .reduce((acc, v) => Object.assign(acc, v.dataMap), {});
        
          return mapDeep(d, v => {
            // We have now set within this block context, this enum to Used
            if (v.type === 'Enum') {
              v.type = 'UsedEnum';
            }
        
            // Set constants in context to used
            if (v.type === 'Constant') {
              v.type = 'UsedConstant';
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
        
            // Return object
            return v;
          });
        } },
    {"name": "Block", "symbols": [{"literal":"{"}, "_", {"literal":"}"}], "postprocess": extractArray},
    {"name": "Switch", "symbols": [{"literal":"switch"}, "_", "Expression", "_", "SwitchDefinitions"]},
    {"name": "SwitchDefinitions$ebnf$1", "symbols": []},
    {"name": "SwitchDefinitions$ebnf$1$subexpression$1", "symbols": ["_", "SwitchDefinition"]},
    {"name": "SwitchDefinitions$ebnf$1", "symbols": ["SwitchDefinitions$ebnf$1", "SwitchDefinitions$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "SwitchDefinitions", "symbols": ["SwitchDefinition", "SwitchDefinitions$ebnf$1"], "postprocess": 
        function(d) {
          const clean = d.filter(v => v);
          return d;
        }
        },
    {"name": "SigLiteral", "symbols": [(lexer.has("SigLiteral") ? {type: "SigLiteral"} : SigLiteral)], "postprocess": 
        function(d) {
          const sig = stringToSig(d[0].value.trim().slice(4).slice(0, -1));
          return { type: 'HexNumber', value: sig, text: sig };
        }
        },
    {"name": "TopicLiteral", "symbols": [(lexer.has("TopicLiteral") ? {type: "TopicLiteral"} : TopicLiteral)], "postprocess": 
        function(d) {
          const sig = stringToSig(d[0].value.trim().slice(6, -1));
          return { type: 'HexNumber', value: sig, text: sig };
        }
        },
    {"name": "Boolean", "symbols": [(lexer.has("boolean") ? {type: "boolean"} : boolean)], "postprocess":  function(d) {
          if (d[0].value === "true") {
            return { type: 'HexNumber', value: '0x01', text: '0x01' };
          } else {
            return { type: 'HexNumber', value: '0x00', text: '0x00' };
          }
        } },
    {"name": "EnumDeclaration", "symbols": [{"literal":"enum"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "IdentifierList", "_", {"literal":")"}], "postprocess": 
        function (d) {
          const ids = _filter(d, 'Identifier');
          const name = ids[0];
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
            toString: () => '',
            dataMap,
          };
        }
        },
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
    {"name": "Case", "symbols": [{"literal":"case"}, "_", "Literal", "_", "Block"]},
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
    {"name": "IfStatement", "symbols": [{"literal":"if"}, "_", "Expression", "_", "Block"]},
    {"name": "NumericLiteral", "symbols": [(lexer.has("NumberLiteral") ? {type: "NumberLiteral"} : NumberLiteral)], "postprocess": id},
    {"name": "NumericLiteral", "symbols": [(lexer.has("HexNumber") ? {type: "HexNumber"} : HexNumber)], "postprocess": id},
    {"name": "NumericLiteral", "symbols": ["SigLiteral"], "postprocess": id},
    {"name": "NumericLiteral", "symbols": ["TopicLiteral"], "postprocess": id},
    {"name": "Literal", "symbols": [(lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)], "postprocess": id},
    {"name": "Literal", "symbols": ["NumericLiteral"], "postprocess": id},
    {"name": "Expression", "symbols": ["Literal"], "postprocess": id},
    {"name": "Expression", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier)], "postprocess": id},
    {"name": "Expression", "symbols": ["FunctionCall"], "postprocess": id},
    {"name": "Expression", "symbols": ["Boolean"], "postprocess": id},
    {"name": "FunctionCall$ebnf$1", "symbols": []},
    {"name": "FunctionCall$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "Expression"]},
    {"name": "FunctionCall$ebnf$1", "symbols": ["FunctionCall$ebnf$1", "FunctionCall$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FunctionCall", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "Expression", "FunctionCall$ebnf$1", "_", {"literal":")"}], "postprocess": functionCall},
    {"name": "FunctionCall", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}], "postprocess": functionCall},
    {"name": "ArraySpecifier", "symbols": [{"literal":"["}, "_", "NumericLiteral", "_", {"literal":"]"}], "postprocess": 
        function (d) {
          return {
            type: 'ArraySpecifier',
            value: d[2].value,
            text: d[2].value,
          };
        }
        },
    {"name": "IdentifierList$ebnf$1", "symbols": []},
    {"name": "IdentifierList$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier)]},
    {"name": "IdentifierList$ebnf$1", "symbols": ["IdentifierList$ebnf$1", "IdentifierList$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "IdentifierList", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "IdentifierList$ebnf$1"], "postprocess": extractArray},
    {"name": "MemoryStructIdentifier$subexpression$1", "symbols": ["NumericLiteral"]},
    {"name": "MemoryStructIdentifier$subexpression$1", "symbols": ["ArraySpecifier"]},
    {"name": "MemoryStructIdentifier", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":":"}, "_", "MemoryStructIdentifier$subexpression$1"], "postprocess": 
        function (d) {
          // check memory struct nuermic literal or identifier
          const size = utils.bigNumberify(d[4][0].value);
        
          return {
            type: 'MemoryStructIdentifier',
            name: d[0].value,
            value: d[4][0],
          };
        }
        },
    {"name": "MemoryStructList$ebnf$1", "symbols": []},
    {"name": "MemoryStructList$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "MemoryStructIdentifier"]},
    {"name": "MemoryStructList$ebnf$1", "symbols": ["MemoryStructList$ebnf$1", "MemoryStructList$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "MemoryStructList", "symbols": ["MemoryStructIdentifier", "MemoryStructList$ebnf$1"], "postprocess": extractArray},
    {"name": "MemoryStructDeclaration", "symbols": [{"literal":"mstruct"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "MemoryStructList", "_", {"literal":")"}], "postprocess": 
        function (d) {
          const name = d[2].value;
          const properties = _filter(d[6], 'MemoryStructIdentifier');
          let methodList = properties.map(v => name + '.' + v.name);
          let methods = properties.reduce((acc, v, i) => Object.assign(acc, {
            [name + '.' + v.name]: {
              size: v.value.value,
              offset: addValues(methodList.slice(0, i)
                .map(name => acc[name].size)),
              method: `function ${name + '.' + v.name}(pos) -> res {
                res := mslice(${addValues(methodList.slice(0, i)
                  .map(name => acc[name].size))}, ${v.value.value})
              }`,
            },
            /* [name + '.' + v.name + '.position']: '',
            [name + '.' + v.name + '.offset']: {
              offsetMath: addValues(methodList.slice(0, i).map(name => {
        
              })),
              method: `function ${name + '.' + v.name + '.offset'}() -> _offset {
              }`,
            },
            [name + '.' + v.name + '.index']: {
              method: `function ${name + '.' + v.name + '.index'}() -> _index {
                _index := ${i}
              }`,
            },
            [name + '.' + v.name + '.size']: {
              method: `function ${name + '.' + v.name + '.size'}() -> _size {
                _size := ${v.value.value}
              }`,
            },
            */
          }), {});
          methods[name + '.length'] = '';
        
          console.log(methodList, methods);
        
          return {
            type: 'MemoryStructDeclaration',
            name,
            properties,
            value: '',
            text: '',
            toString: () => '',
          };
        }
        },
    {"name": "VariableDeclaration", "symbols": [{"literal":"let"}, "_", "IdentifierList", "_", {"literal":":="}, "_", "Expression"]},
    {"name": "ConstantDeclaration", "symbols": [{"literal":"const"}, "_", "IdentifierList", "_", {"literal":":="}, "_", "Expression"], "postprocess": 
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
        },
    {"name": "Assignment", "symbols": ["IdentifierList", "_", {"literal":":="}, "_", "Expression"], "postprocess": 
        function (d) {
          d[0][0]._identifiers = _filter(d[0], 'Identifier');
          d[0][0].type = 'Assignment';
          d[0][0]._value = d[4];
          return d;
        }
        },
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
  , ParserStart: "Yul"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
