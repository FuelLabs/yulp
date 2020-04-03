// Generated automatically by nearley, version 2.19.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

  const moo = require('moo')
  const { utils } = require('ethers');
  const clone = require('rfdc')() // Returns the deep copy function

  function id(x) { return x[0]; }

  const print = (v, isArr = Array.isArray(v)) => (isArr ? v : [v])
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
    ConstIdentifier: /(?:const)(?:\s)/,
    keyword: ['code', 'let', "for", "function", "enum", "mstruct",
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
    d[0].name = d[0].value;

    // if mstore(0, x, x, x) args, than process this..
    if (d[0].value === 'mstore' && d[2][3].length > 1) {
      console.log('special mstore', d);

      // values after pos, x, [....]
      const secondaryValues = d[2][3].slice(1);

      // slice away the secondary values
      d[2][3] = d[2][3].slice(0, 1);

      // New injected mstores
      const firstMstoreArgument = print(d[2][2]);
      const additionalMstores = secondaryValues.map((v, i) => {

        const mstoreCopy = clone(d);
        const valOffset = (i + 1) * 32;
        mstoreCopy[2][2] = [
          { type: 'FunctionCallIdentifier', noSafeMath: true, name: 'add', value: 'add', text: 'add', toString: () => 'add' },
          [{ type: 'bracket', value: '(', text: '(', toString: () => '(' },
          clone(d[2][2]),
          { type: 'comma', text: ',', value: ',', toString: () => ',' },
          { type: 'NumberLiteral', value: valOffset, text: valOffset, toString: () => valOffset },
          { type: 'bracket', value: ')', text: ')', toString: () => ')' }],
        ];
        mstoreCopy[2][3][0] = v;

        return mstoreCopy;
      });

      d = d.concat(additionalMstores
          .map(v => [{ type: 'space', text: ' ', value: ' ', toString: () => ' ' }].concat(v)));
    }

    return d;
  }

  function extractArray(d) {
    return d;
  }

  function addValues(vals) {
    let cummulativeValue = utils.bigNumberify(0);
    let _vals = [0];

    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      const isInt = Number.isInteger(v);

      if (v.type === 'HexLiteral'
        || v.type === 'NumberLiteral'
        || isInt) {
        if (isInt) {
          cummulativeValue = cummulativeValue.add(utils.bigNumberify(v));
        } else {
          cummulativeValue = cummulativeValue.add(v.value);
        }
      } else {
        _vals.push(v);
      }
    }

    // Vals
    _vals[0] = {
      type: 'HexLiteral',
      value: cummulativeValue.toHexString(),
      text: cummulativeValue.toHexString(),
      toString: () => cummulativeValue.toHexString(),
    };

    return _vals
      .map(v => `add(${v.value || v}, `)
      .concat(['0'])
      .concat(Array(_vals.length).fill(')'))
      .join('');
  }

  const sliceMethod = `
function mslice(position, length) -> result {
  if gt(length, 32) { revert(0, 0) } // protect against overflow

  result := div(mload(position), exp(2, sub(256, mul(length, 8))))
}

`;
  const sliceObject = {
    value: sliceMethod,
    text: sliceMethod,
    type: 'MethodInjection',
    toString: () => sliceMethod,
  };

  const requireMethod = `
function require(arg) {
  if lt(arg, 1) {
    revert(0, 0)
  }
}
`;

  // Include safe maths
  let identifierTree = {};
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
          const functionCalls = _filter(d, 'FunctionCallIdentifier');
          const usesSlice = functionCalls
            .filter(v => v.value === 'mslice' || v._includeMarker === 'mslice')
            .length > 0;
          let usesRequire = functionCalls
            .filter(v => v.usesRequire === true)
            .length > 0;
          const usesMath = functionCalls
            .filter(v => v.usesSafeMath === true)
            .length > 0;
          let __methodToInclude = {};
        
          if (usesMath) {
            usesRequire = true;
            __methodToInclude['safeAdd'] = `
        function safeAdd(x, y) -> z {
          z := add(x, y)
          require(or(eq(z, x), gt(z, x)))
        }
        `;
        
            __methodToInclude['safeSub'] = `
        function safeSub(x, y) -> z {
          z := sub(x, y)
          require(or(eq(z, x), lt(z, x)))
        }
        `;
        
            __methodToInclude['safeMul'] = `
        function safeMul(x, y) -> z {
          if gt(y, 0) {
            z := mul(x, y)
            require(eq(div(z, y), x))
          }
        }
        `;
        
            __methodToInclude['safeDiv'] = `
          function safeDiv(x, y) -> z {
            require(gt(y, 0))
            z := div(x, y)
          }
          `;
          }
        
          if (usesRequire) {
            __methodToInclude['require'] = requireMethod;
          }
        
          if (usesSlice) {
            d[2].splice(2, 0, sliceObject);
          }
        
          d[2].splice(2, 0, Object.keys(__methodToInclude)
              .map(key => ({
            type: 'InjectedMethod',
            value: __methodToInclude[key],
            text: __methodToInclude[key],
            toString: () => __methodToInclude[key],
          })));
        
        
          return d;
        }
        },
    {"name": "Block$ebnf$1", "symbols": []},
    {"name": "Block$ebnf$1$subexpression$1", "symbols": ["_", "Statement"]},
    {"name": "Block$ebnf$1", "symbols": ["Block$ebnf$1", "Block$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Block", "symbols": [{"literal":"{"}, "_", "Statement", "Block$ebnf$1", "_", {"literal":"}"}], "postprocess":  function(d, l) {
          const blockId = d[0].line + '.' + d[0].col;
          const currentBlock = identifierTree[blockId] = {
            type: 'Block',
            id: blockId,
            value: ``, // `/* ${blockId} */`,
          };
        
          // Scan for enums and constant declarations
          const enums = _filter(d, 'Enum')
            .reduce((acc, v) => Object.assign(acc, v.dataMap), {});
          const constants = _filter(d, 'Constant')
            .reduce((acc, v) => Object.assign(acc, v.dataMap), {});
          const mstructs = _filter(d, 'MemoryStructDeclaration')
            .reduce((acc, v) => Object.assign(acc, v.dataMap), {});
          let methodToInclude = {};
          const duplicateChecks = {};
          let err = null;
          const dubcheck = (_type, v) => {
            if (typeof duplicateChecks[_type + v.name] === 'undefined') {
              duplicateChecks[_type + v.name] = v;
            } else {
              throw new Error(`${_type} already declared with the same identifier "${v.name}" on line ${duplicateChecks[_type + v.name].line} and ${v.line}. All ${_type} must have the unique names. Scoping coming soon.`);
            }
          };
        
          let _map = mapDeep(d, v => {
            if (err) { throw new Error(err) }
        
            // We have now set within this block context, this enum to Used
            if (v.type === 'Enum') {
              v.type = 'UsedEnum';
            }
        
            if (v.type === 'UsedEnum') {
              dubcheck('Enum', v);
            }
        
            // Set constants in context to used
            if (v.type === 'Constant') {
              v.type = 'UsedConstant';
              v.block = currentBlock.id;
            }
        
            if (v.type === 'UsedConstant') {
              for (let vi = 0; vi < v.__itendifiers.length; vi++) {
                // currentBlock.identifiers.push(v.__itendifiers[vi]);
        
                dubcheck('Constant', Object.assign(v, {
                  name: v.__itendifiers[vi],
                }));
              }
            }
        
            // Used now..
            if (v.type === 'MemoryStructDeclaration') {
              v.type = 'UsedMemoryStructDeclaration';
            }
        
            if (v.type === 'UsedMemoryStructDeclaration') {
              dubcheck('MemoryStructDeclaration', v);
            }
        
            // Check for constant re-assignments
            if (v.type === 'Assignment') {
              for (var i = 0; i < v._identifiers.length; i++) {
                if (typeof constants[v._identifiers[i].value] !== 'undefined') {
                  throw new Error(`Constant re-assignment '${v._identifiers[i].value}' to '${print(v._value)}' at line ${v.line}`);
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
        
            if (v.type === 'FunctionCallIdentifier'
              && typeof mstructs[v.name] !== 'undefined') {
              methodToInclude[v.name] = "\n" + mstructs[v.name].method + "\n";
        
              // recursive get require
              const getRequired = required => {
                // include the required methods from the struct
                for (var im = 0; im < required.length; im++) {
                  const requiredMethodName = required[im];
        
                  // this has to be recursive for arrays etc..
                  methodToInclude[requiredMethodName] = "\n"
                    + mstructs[requiredMethodName].method
                    + "\n";
        
                  getRequired(mstructs[requiredMethodName].required);
                }
              };
        
              // get required..
              getRequired(mstructs[v.name].required);
            }
        
            // Safe Math Multiply
            if (v.type === 'FunctionCallIdentifier'
              && v.name === 'require') {
              v.usesRequire = true;
            }
        
            if (v.type === 'FunctionCallIdentifier'
              && v.name === 'add'
              && !v.noSafeMath) {
              v.text = 'safeAdd';
              v.value = 'safeAdd';
              v.usesSafeMath = true;
            }
        
            if (v.type === 'FunctionCallIdentifier'
              && v.name === 'sub') {
              v.text = 'safeSub';
              v.value = 'safeSub';
              v.usesSafeMath = true;
            }
        
            if (v.type === 'FunctionCallIdentifier'
              && v.name === 'mul') {
              v.text = 'safeMul';
              v.value = 'safeMul';
              v.usesSafeMath = true;
            }
        
            if (v.type === 'FunctionCallIdentifier'
              && v.name === 'div') {
              v.text = 'safeDiv';
              v.value = 'safeDiv';
              v.usesSafeMath = true;
            }
        
            // Return object
            return v;
          });
        
          // inject mslice if any mstruct method used.
          if (Object.keys(methodToInclude).length > 0) {
            _map.splice(2, 0, {
              type: 'FunctionCallIdentifier',
              value: '',
              text: '',
              _includeMarker: 'mslice',
              usesSafeMath: true,
              toString: () => '',
            });
          }
        
          // set secondary kind of first element to Block
          _map.splice(0, 0, currentBlock);
        
          // add methods to include
          _map.splice(2, 0, Object.keys(methodToInclude)
              .map(key => ({
            type: 'InjectedMstructMethod',
            value: methodToInclude[key],
            text: methodToInclude[key],
            toString: () => methodToInclude[key],
          })));
        
          return _map;
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
          const sig = stringToSig(d[0].value.trim().slice(4).slice(0, -1)); // remove sig" and "
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
    {"name": "EnumDeclaration", "symbols": [{"literal":"enum"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}], "postprocess": 
        function (d) {
          return {};
        }
          },
    {"name": "EnumDeclaration", "symbols": [{"literal":"enum"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "IdentifierList", "_", {"literal":")"}], "postprocess": 
        function (d) {
          const ids = _filter(d, 'Identifier');
          const name = ids[0].value;
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
            line: ids[0].line,
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
    {"name": "ExpressionList$ebnf$1", "symbols": []},
    {"name": "ExpressionList$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "Expression"]},
    {"name": "ExpressionList$ebnf$1", "symbols": ["ExpressionList$ebnf$1", "ExpressionList$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ExpressionList", "symbols": [{"literal":"("}, "_", "Expression", "ExpressionList$ebnf$1", "_", {"literal":")"}]},
    {"name": "FunctionCall", "symbols": [(lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", "ExpressionList"], "postprocess": functionCall},
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
    {"name": "MemoryStructDeclaration", "symbols": [{"literal":"mstruct"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", {"literal":")"}], "postprocess":  function(d) {
            return {
              type: 'MemoryStructDeclaration',
              name: d[2].value,
              dataMap: {},
              value: '',
              text: '',
              line: d[2].line,
              toString: () => '',
            };
        } },
    {"name": "MemoryStructDeclaration", "symbols": [{"literal":"mstruct"}, "_", (lexer.has("Identifier") ? {type: "Identifier"} : Identifier), "_", {"literal":"("}, "_", "MemoryStructList", "_", {"literal":")"}], "postprocess": 
          function (d) {
            const name = d[2].value;
            const properties = _filter(d[6], 'MemoryStructIdentifier');
            let methodList = properties.map(v => name + '.' + v.name);
        
            // check for array length specifiers
            for (var p = 0; p < properties.length; p++) {
              const prop = properties[p];
        
              if (prop.value.type === 'ArraySpecifier'
                && methodList.indexOf(name + '.' + prop.name + '.length') === -1) {
                throw new Error(`In memory struct "${name}", array property "${prop.name}" requires a ".length" property.`);
              }
            }
        
            let dataMap = properties.reduce((acc, v, i) => Object.assign(acc, {
              [name + '.' + v.name]: {
                size: v.value.type === 'ArraySpecifier'
                  ? ('mul('
                    + acc[name + '.' + v.name + '.length'].slice
                    + ', ' + v.value.value + ')')
                  : v.value,
                offset: addValues(methodList.slice(0, i)
                  .map(name => acc[name].size)),
                slice: `mslice(${addValues(['pos'].concat(methodList.slice(0, i)
                  .map(name => acc[name].size)))}, ${v.value.value})`,
                method: v.value.type === 'ArraySpecifier' ?
        `
        function ${name + '.' + v.name}(pos, i) -> res {
          res := mslice(add(${name + '.' + v.name}.position(pos),
            mul(i, ${v.value.value})), ${v.value.value})
        }
        `
        : `
        function ${name + '.' + v.name}(pos) -> res {
          res := mslice(${name + '.' + v.name}.position(pos), ${v.value.value})
        }
        `,
                required: [
                  name + '.' + v.name + '.position',
                ],
              },
              [name + '.' + v.name + '.keccak256']: {
                method: `
        function ${name + '.' + v.name + '.keccak256'}(pos) -> _hash {
          _hash := keccak256(${name + '.' + v.name + '.position'}(pos),
            ${v.value.type === 'ArraySpecifier'
              ? `mul(${name + '.' + v.name + '.length'}(pos),
                  ${name + '.' + v.name + '.size'}())`
              : `${name + '.' + v.name + '.size'}()`})
        }
        `,
                required: [
                  name + '.' + v.name + '.position',
                  name + '.' + v.name + '.size',
                ].concat(v.value.type === 'ArraySpecifier'
                  ? [name + '.' + v.name + '.length']
                  : []),
              },
              [name + '.' + v.name + '.position']: {
                method: `
        function ${name + '.' + v.name + '.position'}(pos) -> _offset {
          _offset := ${addValues(['pos'].concat(methodList.slice(0, i)
            .map(name => acc[name].size)))}
        }
        `,
                required: [],
              },
              [name + '.' + v.name + '.offset']: {
                method: `
        function ${name + '.' + v.name + '.offset'}(pos) -> _offset {
        ${v.value.type === 'ArraySpecifier'
          ? `_offset := add(${name + '.' + v.name + '.position(pos)'}, mul(${name + '.' + v.name + '.length(pos)'}, ${v.value.value}))`
          : `_offset := add(${name + '.' + v.name + '.position(pos)'}, ${v.value.value})`}
        }
        `,
                required: (v.value.type === 'ArraySpecifier'
                  ? [name + '.' + v.name + '.length', name + '.' + v.name + '.length.position']
                  : []).concat([
                    name + '.' + v.name + '.position',
                  ]),
              },
              [name + '.' + v.name + '.index']: {
                method: `
        function ${name + '.' + v.name + '.index'}() -> _index {
          _index := ${i}
        }
        `,
                required: [],
              },
              [name + '.' + v.name + '.size']: {
                method: `
        function ${name + '.' + v.name + '.size'}() -> _size {
          _size := ${v.value.value}
        }
        `,
                required: [],
              },
            }), {});
        
            dataMap[name + '.keccak256'] = {
              method: `
        function ${name + '.keccak256'}(pos) -> _hash {
          _hash := keccak256(pos, ${name + '.size'}(pos))
        }
        `,
              required: [name + '.size', name + '.offset'],
            };
        
            dataMap[name + '.size'] = {
              method: `
        function ${name + '.size'}(pos) -> _offset {
          _offset := safeSub(${name + '.offset'}(pos), pos)
        }
        `,
              required: [name + '.offset'],
            };
        
            dataMap[name + '.offset'] = {
              method: `
        function ${name + '.offset'}(pos) -> _offset {
          _offset := ${methodList.length
          ? methodList[methodList.length - 1] + '.offset(pos)' : '0'}
        }
        `,
              required: methodList.length > 0
                ? [methodList[methodList.length - 1] + '.offset']
                    .concat(dataMap[methodList[methodList.length - 1] + '.offset'].required)
                : [],
            };
        
            return {
              type: 'MemoryStructDeclaration',
              name,
              dataMap,
              value: '',
              text: '',
              line: d[2].line,
              toString: () => '',
            };
          }
        },
    {"name": "VariableDeclaration", "symbols": [{"literal":"let"}, "_", "IdentifierList", "_", {"literal":":="}, "_", "Expression"]},
    {"name": "ConstantDeclaration", "symbols": [(lexer.has("ConstIdentifier") ? {type: "ConstIdentifier"} : ConstIdentifier), "_", "IdentifierList", "_", {"literal":":="}, "_", "Expression"], "postprocess": 
        function (d) {
          // Change const to let
          d[0].value = 'let ';
          d[0].text = 'let ';
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
