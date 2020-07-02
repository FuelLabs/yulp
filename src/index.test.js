const { test } = require('zora');
const { compile, print } = require('./index');
const solc = require('solc');

function yulToYulp(source, t) {
  t.equal(print(compile(source).results), source, 'yul to yulp');
}

// Parse and Compile
function yulCompile(source) {
  try {
    var output = JSON.parse(solc.compile(JSON.stringify({
      language: 'Yul',
      sources: {
        'Target.yul': {
          content: source,
        },
      },
      "settings": {
        "outputSelection": { "*": { "*": ["*"], "": [ "*" ] } },
        "optimizer": { "enabled": false, "details": { "yul": true } }
      }
    })));

    // is errors in compiling
    const isErrors = (output.errors || [])
      .filter(v => v.type !== 'Warning').length;

    if (isErrors) {
      return { errors: output.errors, bytecode: null };
    }

    return {
      errors: null,
      bytecode: '0x' + output.contracts['Target.yul'].Target.evm.bytecode.object,
    };
  } catch (error) {
    return { errors: error, bytecode: null };
  }
}

test('yulp should be yul', t => {


  yulToYulp(`object "SimpleStore" {}`, t);
  yulToYulp(``, t);
  yulToYulp(`object "SimpleStore" {
    code {
    }
  }`, t);
  yulToYulp(`object "SimpleStore" {
    code {
      codecopy(0, 0, 0)
    }
  }`, t);
  yulToYulp(`object "HeyYa" {
    data "cool" hex"a2322"
  }`, t);
  yulToYulp(`object "SimpleStore" {
    code {
      // constructor code

      datacopy(0, dataoffset("Runtime"), datasize("Runtime"))  // runtime code
      return(0, datasize("Runtime"))
    }
    object "Runtime" {
      code {
        calldatacopy(0, 0, 36) // copy calldata to memory

        switch and(shr(224, mload(0)), 0xffffffff) // 4 byte method signature

        case 0x6057361d { // store(uint256 val)
          sstore(0, mload(4))
        }

        case 0x6d4ce63c { // get() returns (uint256)
          mstore(100, sload(0))
          return (100, 32)
        }
      }
    }
  }`, t);

  t.equal(print(compile(`
    object "SimpleStore" {
      code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
      }
      object "Runtime" {
        code {
          calldatacopy(0, 0, 36) // write calldata to memory

          mstruct Calldata(
            sig: 4,
            val: 32
          )

          require(0, error"nick")
          require(311, error"nick")

          switch Calldata.sig(0) // select signature from memory

          case sig"function store(uint256 val)" { // new signature method
            sstore(0, Calldata.val(0)) // sstore calldata value
            require(311, error"nick")
          }

          case sig"function get() returns (uint256)" {
            mstore(100, sload(0))
            return (100, 32)
          }
        }
      }
    }
    `).results),
    `object \"SimpleStore\" {\n      code {\n        datacopy(0, dataoffset(\"Runtime\"), datasize(\"Runtime\"))\n        return(0, datasize(\"Runtime\"))\n      }\n      object \"Runtime\" {\n        code {\nfunction require(arg, message) {\n  if lt(arg, 1) {\n    mstore(0, message)\n    revert(0, 32)\n  }\n}\n\nfunction mslice(position, length) -> result {\n  result := div(mload(position), exp(2, sub(256, mul(length, 8))))\n}\n\n\nfunction Calldata.sig(pos) -> res {\n  res := mslice(Calldata.sig.position(pos), 4)\n}\n\n\n\nfunction Calldata.sig.position(_pos) -> _offset {\n  \n      \n        function Calldata.sig.position._chunk0(pos) -> __r {\n          __r := 0x00\n        }\n      \n        function Calldata.sig.position._chunk1(pos) -> __r {\n          __r := pos\n        }\n      \n\n      _offset := add(Calldata.sig.position._chunk0(_pos), add(Calldata.sig.position._chunk1(_pos), 0))\n    \n}\n\n\n\nfunction Calldata.val(pos) -> res {\n  res := mslice(Calldata.val.position(pos), 32)\n}\n\n\n\nfunction Calldata.val.position(_pos) -> _offset {\n  \n      \n        function Calldata.val.position._chunk0(pos) -> __r {\n          __r := 0x04\n        }\n      \n        function Calldata.val.position._chunk1(pos) -> __r {\n          __r := pos\n        }\n      \n\n      _offset := add(Calldata.val.position._chunk0(_pos), add(Calldata.val.position._chunk1(_pos), 0))\n    \n}\n\n\n          calldatacopy(0, 0, 36) // write calldata to memory\n\n          \n\n          require(0, 0x01)\n          require(311, 0x01)\n\n          switch Calldata.sig(0) // select signature from memory\n\n          case 0x6057361d { // new signature method\n            sstore(0, Calldata.val(0)) // sstore calldata value\n            require(311, 0x01)\n          }\n\n          case 0x6d4ce63c {\n            mstore(100, sload(0))\n            return (100, 32)\n          }\n        }\n      }\n    }`, 'const');


  t.equal(print(compile(`

    object "Another3" {
      code {
        mstruct Nick (
          cool: 10
        )

        let boooo := 1
      }
    }

    object "Another" is "Another3" {
      code {
        mstruct Nick2 (
          cool: 10
        )

        let boooo := Nick.cool(3)
      }
    }

    `).results),
    `object \"Another\"   {\n      code {\nfunction mslice(position, length) -> result {\n  result := div(mload(position), exp(2, sub(256, mul(length, 8))))\n}\n\n\nfunction Nick.cool(pos) -> res {\n  res := mslice(Nick.cool.position(pos), 10)\n}\n\n\n\nfunction Nick.cool.position(_pos) -> _offset {\n  \n      \n        function Nick.cool.position._chunk0(pos) -> __r {\n          __r := 0x00\n        }\n      \n        function Nick.cool.position._chunk1(pos) -> __r {\n          __r := pos\n        }\n      \n\n      _offset := add(Nick.cool.position._chunk0(_pos), add(Nick.cool.position._chunk1(_pos), 0))\n    \n}\n\n\n        \n\n        let boooo := 1\n      \n        \n\n        let boooo := Nick.cool(3)\n      }\n    }`, 'const');


  t.equal(print(compile(` object "SimpleStore" { code { enum Color(red, blue, green) return (Color.blue, Color.green) } } `).results),
    `object \"SimpleStore\" { code {  return (1, 2) } }`, 'const');

  t.equal(print(compile(` object "SimpleStore" { code { const nick := 0 } } `).results),
    `object \"SimpleStore\" { code {  } }`, 'const');

  t.equal(print(compile(` object "SimpleStore" { code { require(0, error"nick") require(1, error"john") } } `).results),
    `object \"SimpleStore\" { code {\nfunction require(arg, message) {\n  if lt(arg, 1) {\n    mstore(0, message)\n    revert(0, 32)\n  }\n}\n require(0, 0x01) require(1, 0x02) } }`, 'const');

});
