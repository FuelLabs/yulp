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
    {"name": "ObjectDefinition$ebnf$1$subexpression$1", "symbols": ["_", "objectStatement"]},
    {"name": "ObjectDefinition$ebnf$1", "symbols": ["ObjectDefinition$ebnf$1", "ObjectDefinition$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ObjectDefinition", "symbols": [{"literal":"object"}, "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral), "_", {"literal":"{"}, "ObjectDefinition$ebnf$1", "_", {"literal":"}"}]},
    {"name": "objectStatement", "symbols": ["CodeDefinition"], "postprocess": function(d) { return d[0]; }},
    {"name": "objectStatement", "symbols": ["DataDeclaration"], "postprocess": function(d) { return d[0]; }},
    {"name": "objectStatement", "symbols": ["ObjectDefinition"], "postprocess": function(d) { return d[0]; }},
    {"name": "objectStatement", "symbols": ["Comment"], "postprocess": function(d) { return d[0]; }},
    {"name": "DataDeclaration", "symbols": [{"literal":"data"}, "_", (lexer.has("StringLiteral") ? {type: "StringLiteral"} : StringLiteral), "_", (lexer.has("HexLiteral") ? {type: "HexLiteral"} : HexLiteral)]},
    {"name": "CodeDefinition", "symbols": [{"literal":"code"}, "_", {"literal":"{"}, "_", {"literal":"}"}], "postprocess": function(d) { return d; }},
    {"name": "CodeDefinition", "symbols": [{"literal":"code"}, "_", "Block"]},
    {"name": "Comment", "symbols": ["MultiLineComment"]},
    {"name": "Comment", "symbols": ["SingleLineComment"], "postprocess": id},
    {"name": "MultiLineComment", "symbols": [(lexer.has("multiComment") ? {type: "multiComment"} : multiComment)], "postprocess": id},
    {"name": "SingleLineComment", "symbols": [(lexer.has("singleLineComment") ? {type: "singleLineComment"} : singleLineComment)], "postprocess": id},
    {"name": "Block$ebnf$1", "symbols": []},
    {"name": "Block$ebnf$1$subexpression$1", "symbols": ["_", "Statement"]},
    {"name": "Block$ebnf$1", "symbols": ["Block$ebnf$1", "Block$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Block", "symbols": [{"literal":"{"}, "_", "Statement", "Block$ebnf$1", "_", {"literal":"}"}], "postprocess": extractArray},
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
