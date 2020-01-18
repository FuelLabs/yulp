// Generated automatically by nearley, version 2.19.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

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
    boolean: ["true", "false"],
    bracket: ["{", "}", "(", ")"],
    keyword: ["object", "code", 'let', "for", "function", "data",
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
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "Yul$ebnf$1", "symbols": []},
    {"name": "Yul$ebnf$1$subexpression$1", "symbols": ["_", "Chunk"]},
    {"name": "Yul$ebnf$1", "symbols": ["Yul$ebnf$1", "Yul$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Yul", "symbols": ["Yul$ebnf$1", "_"], "postprocess": function(d) { return d; }},
    {"name": "Chunk", "symbols": ["Comment"]},
    {"name": "Chunk", "symbols": ["ObjectDefinition"], "postprocess": function(d) { return d[0]; }},
    {"name": "ObjectDefinition$ebnf$1", "symbols": []},
    {"name": "ObjectDefinition$ebnf$1$subexpression$1", "symbols": ["_", "ObjectStatement"]},
    {"name": "ObjectDefinition$ebnf$1", "symbols": ["ObjectDefinition$ebnf$1", "ObjectDefinition$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ObjectDefinition", "symbols": [{"literal":"object"}, "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral), "_", {"literal":"{"}, "ObjectDefinition$ebnf$1", "_", {"literal":"}"}], "postprocess": function(d) { console.log(d); return d; }},
    {"name": "ObjectStatement", "symbols": ["CodeDefinition"], "postprocess": function(d) { return d[0]; }},
    {"name": "ObjectStatement", "symbols": ["DataDeclaration"], "postprocess": function(d) { return d[0]; }},
    {"name": "ObjectStatement", "symbols": ["ObjectDefinition"], "postprocess": function(d) { return d[0]; }},
    {"name": "ObjectStatement", "symbols": ["Comment"], "postprocess": function(d) { return d[0]; }},
    {"name": "DataDeclaration$subexpression$1", "symbols": ["_"]},
    {"name": "DataDeclaration$subexpression$1", "symbols": [(lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)]},
    {"name": "DataDeclaration$subexpression$2", "symbols": [(lexer.has("HexLiteral") ? {type: "HexLiteral"} : HexLiteral)]},
    {"name": "DataDeclaration$subexpression$2", "symbols": [(lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)]},
    {"name": "DataDeclaration", "symbols": [{"literal":"data"}, "_", "DataDeclaration$subexpression$1", "_", "DataDeclaration$subexpression$2"]},
    {"name": "CodeDefinition", "symbols": [{"literal":"code"}, "_", {"literal":"{"}, "_", {"literal":"}"}], "postprocess": function(d) { return null; }},
    {"name": "CodeDefinition", "symbols": [{"literal":"code"}, "_", "Block"], "postprocess": function(d) { return [d[0], d[2]]; }},
    {"name": "Comment", "symbols": ["MultiLineComment"]},
    {"name": "Comment", "symbols": ["SingleLineComment"], "postprocess": id},
    {"name": "Boolean", "symbols": [(lexer.has("boolean") ? {type: "boolean"} : boolean)], "postprocess":  function(d) {
          if (d[0].value === "true") {
            return { type: 'HexNumber', value: '0x01', text: '0x01' };
          } else {
            return { type: 'HexNumber', value: '0x00', text: '0x00' };
          }
        } },
    {"name": "SigLiteral", "symbols": [(lexer.has("SigLiteral") ? {type: "SigLiteral"} : SigLiteral)], "postprocess": 
        function(d) {
          const sig = stringToSig(d[0].value.trim().slice(4).slice(0, -1));
          return { type: 'HexNumber', value: sig, text: sig };
        }
        },
    {"name": "TopicLiteral", "symbols": [(lexer.has("TopicLiteral") ? {type: "TopicLiteral"} : TopicLiteral)], "postprocess": 
        function(d) {
          const sig = stringToSig(d[0].value.trim().slice(4).slice(0, -1));
          return { type: 'HexNumber', value: sig, text: sig };
        }
        },
    {"name": "MultiLineComment", "symbols": [(lexer.has("multiComment") ? {type: "multiComment"} : multiComment)], "postprocess": id},
    {"name": "SingleLineComment", "symbols": [(lexer.has("singleLineComment") ? {type: "singleLineComment"} : singleLineComment)], "postprocess": id},
    {"name": "FunctionCall$ebnf$1", "symbols": []},
    {"name": "FunctionCall$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "Expression"]},
    {"name": "FunctionCall$ebnf$1", "symbols": ["FunctionCall$ebnf$1", "FunctionCall$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FunctionCall", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "Expression", "FunctionCall$ebnf$1", "_", {"literal":")"}], "postprocess": FunctionCall},
    {"name": "FunctionCall$ebnf$2", "symbols": []},
    {"name": "FunctionCall$ebnf$2$subexpression$1", "symbols": ["_", {"literal":","}, "_", "Expression"]},
    {"name": "FunctionCall$ebnf$2", "symbols": ["FunctionCall$ebnf$2", "FunctionCall$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FunctionCall", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "Expression", "FunctionCall$ebnf$2", "_", {"literal":")"}, {"literal":"."}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier)], "postprocess": FunctionCall},
    {"name": "FunctionCall", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}], "postprocess": FunctionCall},
    {"name": "FunctionCall", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}, {"literal":"."}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier)], "postprocess": FunctionCall},
    {"name": "Assignment", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":":="}, "_", "Expression"]},
    {"name": "VariableDeclaration", "symbols": [{"literal":"let"}, "_", "IdentifierList", "_", {"literal":":="}, "_", "Expression"]},
    {"name": "ConstantDeclaration", "symbols": [{"literal":"const"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":":="}, "_", "Literal"], "postprocess": 
        function(d) {
          const clean = d.filter(v => v.type !== 'space' && v.type !== 'keyword');
          return { type: 'constant', name: clean[0], value: clean[2] };
        }
        },
    {"name": "EnumDeclaration", "symbols": [{"literal":"enum"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "IdentifierList", "_", {"literal":")"}], "postprocess": 
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
        },
    {"name": "MemoryStructDeclaration$ebnf$1", "symbols": []},
    {"name": "MemoryStructDeclaration$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "MemoryStructExpression"]},
    {"name": "MemoryStructDeclaration$ebnf$1", "symbols": ["MemoryStructDeclaration$ebnf$1", "MemoryStructDeclaration$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "MemoryStructDeclaration", "symbols": [{"literal":"mstruct"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "MemoryStructExpression", "MemoryStructDeclaration$ebnf$1", "_", {"literal":")"}], "postprocess": 
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
        },
    {"name": "MemoryStructExpression", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":":"}, "_", "Literal"]},
    {"name": "IdentifierList$ebnf$1", "symbols": []},
    {"name": "IdentifierList$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier)]},
    {"name": "IdentifierList$ebnf$1", "symbols": ["IdentifierList$ebnf$1", "IdentifierList$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "IdentifierList", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "IdentifierList$ebnf$1"]},
    {"name": "ForLoop$ebnf$1", "symbols": []},
    {"name": "ForLoop$ebnf$1$subexpression$1", "symbols": ["_", "Statement"]},
    {"name": "ForLoop$ebnf$1", "symbols": ["ForLoop$ebnf$1", "ForLoop$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ForLoop$ebnf$2", "symbols": []},
    {"name": "ForLoop$ebnf$2$subexpression$1", "symbols": ["_", "Statement"]},
    {"name": "ForLoop$ebnf$2", "symbols": ["ForLoop$ebnf$2", "ForLoop$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ForLoop", "symbols": [{"literal":"for"}, "_", {"literal":"{"}, "ForLoop$ebnf$1", "_", {"literal":"}"}, "_", "Expression", "_", {"literal":"{"}, "ForLoop$ebnf$2", "_", {"literal":"}"}, "_", "Block"]},
    {"name": "BreakContinue", "symbols": [{"literal":"break"}]},
    {"name": "BreakContinue", "symbols": [{"literal":"continue"}]},
    {"name": "Switch$ebnf$1", "symbols": []},
    {"name": "Switch$ebnf$1$subexpression$1", "symbols": ["_", "SwitchDefinition"]},
    {"name": "Switch$ebnf$1", "symbols": ["Switch$ebnf$1", "Switch$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Switch", "symbols": [{"literal":"switch"}, "_", "Expression", "_", "Switch$ebnf$1"]},
    {"name": "Switch$ebnf$2", "symbols": []},
    {"name": "Switch$ebnf$2$subexpression$1", "symbols": ["_", "SwitchDefinition"]},
    {"name": "Switch$ebnf$2", "symbols": ["Switch$ebnf$2", "Switch$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Switch", "symbols": [{"literal":"switch"}, "_", "Expression", "_", "Comment", "_", "Switch$ebnf$2"]},
    {"name": "SwitchDefinition", "symbols": ["Case"]},
    {"name": "SwitchDefinition", "symbols": ["Default"]},
    {"name": "Case", "symbols": [{"literal":"case"}, "_", "CaseExpression", "_", "Block"]},
    {"name": "CaseExpression", "symbols": ["Literal"]},
    {"name": "CaseExpression", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier)]},
    {"name": "Default", "symbols": [{"literal":"default"}, "_", "Block"]},
    {"name": "If", "symbols": [{"literal":"if"}, "_", "Expression", "_", "Block"]},
    {"name": "If", "symbols": [{"literal":"if"}, "_", "Expression", "_", {"literal":"{"}, "_", {"literal":"}"}]},
    {"name": "Literal", "symbols": [(lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral)], "postprocess": id},
    {"name": "Literal", "symbols": [(lexer.has("NumberLiteral") ? {type: "NumberLiteral"} : NumberLiteral)], "postprocess": id},
    {"name": "Literal", "symbols": [(lexer.has("HexNumber") ? {type: "HexNumber"} : HexNumber)], "postprocess": id},
    {"name": "Literal", "symbols": ["Boolean"]},
    {"name": "Literal", "symbols": ["SigLiteral"]},
    {"name": "Literal", "symbols": ["TopicLiteral"]},
    {"name": "Expression", "symbols": ["Literal"], "postprocess": id},
    {"name": "Expression", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier)], "postprocess": id},
    {"name": "Expression", "symbols": ["FunctionCall"], "postprocess": id},
    {"name": "Expression", "symbols": ["Comment"], "postprocess": id},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "IdentifierList", "_", {"literal":")"}, "_", {"literal":"->"}, "_", {"literal":"("}, "_", "IdentifierList", "_", {"literal":")"}, "_", "Block"]},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}, "_", {"literal":"->"}, "_", {"literal":"("}, "_", "IdentifierList", "_", {"literal":")"}, "_", "Block"]},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}, "_", {"literal":"->"}, "_", {"literal":"("}, "_", {"literal":")"}, "_", "Block"]},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "IdentifierList", "_", {"literal":")"}, "_", {"literal":"->"}, "_", {"literal":"("}, "_", {"literal":")"}, "_", "Block"]},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "IdentifierList", "_", {"literal":")"}, "_", "Block"]},
    {"name": "FunctionDefinition", "symbols": [{"literal":"function"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}, "_", "Block"]},
    {"name": "Block$ebnf$1", "symbols": []},
    {"name": "Block$ebnf$1$subexpression$1", "symbols": ["_", "Statement"]},
    {"name": "Block$ebnf$1", "symbols": ["Block$ebnf$1", "Block$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Block", "symbols": [{"literal":"{"}, "Block$ebnf$1", "_", {"literal":"}"}], "postprocess": 
        function(d) {
          const constants = allConstants(d);
          const structs = allMemoryStructs(d);
        
          return replaceOutMemoryStructs(replaceOutConstants(d, constants), structs);
        }
        },
    {"name": "Statement", "symbols": ["Expression"]},
    {"name": "Statement", "symbols": ["Assignment"]},
    {"name": "Statement", "symbols": ["VariableDeclaration"]},
    {"name": "Statement", "symbols": ["ConstantDeclaration"]},
    {"name": "Statement", "symbols": ["FunctionDefinition"]},
    {"name": "Statement", "symbols": ["EnumDeclaration"]},
    {"name": "Statement", "symbols": ["MemoryStructDeclaration"]},
    {"name": "Statement", "symbols": ["If"]},
    {"name": "Statement", "symbols": ["ForLoop"]},
    {"name": "Statement", "symbols": ["Switch"]},
    {"name": "Statement", "symbols": ["Comment"]},
    {"name": "_", "symbols": []},
    {"name": "_", "symbols": [(lexer.has("space") ? {type: "space"} : space)], "postprocess": id}
]
  , ParserStart: "Yul"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
