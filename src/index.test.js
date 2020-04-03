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

console.log(yulCompile(`
  object "Target" {
    code {
      mstore(0, 0)
    }
  }
`));

test('yulp should be yul', t => {
  yulToYulp(`object "SimpleStore" {}`, t);
  yulToYulp(``, t);
  yulToYulp(`object "SimpleStore" {
    code {
    }
  }`, t);
  yulToYulp(`// hello
  /*
  code cooldfskjkdsfjk
  @!#$#@%%$
  */
  code {
    // no?
    /*
    yes?
    code {

    }
    */

    function /* dffds */ nick() {

    }
  }`, t);
  yulToYulp(`object "HeyYa" {
    data "cool" hex"a2322"
  }`, t);
  yulToYulp(`code {
      if eq(0, 1) {
      }
    }`, t);
  yulToYulp(`
    code {
    // Enforce transactionIndexOverflow
    assertOrFraud(or(
        secondProofIsLeftish,
        lte(firstMetadataTransactionIndex, selectTransactionIndex(selectTransactionData(SecondProof)))   // ff // runtime code
    ), FraudCode_TransactionIndexOverflow)
  }`, t);
  yulToYulp(`// hello world`, t);
  yulToYulp(`/* hello world */`, t);
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

  t.equal(print(compile(` code { const nick := 0 } `).results), " code { let nick := 0 } ", 'const');
  t.equal(print(compile(` code { const nick, cool := 0 } `).results),
    " code { let nick, cool := 0 } ", 'const');
  t.equal(print(compile(` code { const nick := 0xaaa } `).results), " code { let nick := 0xaaa } ", 'const');
  t.throws(() => print(compile(` code { const nick := 0xaaa const nick := 1 } `).results), 'const dub check');
  t.throws(() => print(compile(` code { const nick := 0xaaa nick := 1 } `).results), 'const dub check');
  t.throws(() => print(compile(` code { const nick := 0xaaa nick := 22 } `).results), 'const assignment check');
  t.equal(print(compile(` code { enum Colors (red, blue, green) let k := Colors.blue } `).results),
    ` code {  let k := 1 } `, 'enum');
  t.equal(print(compile(` code { enum Colors () } `).results),
    ` code {  } `, 'empty enum');
  t.equal(print(compile(` code { let k := mslice(0, 0) } `).results),
    " code { \nfunction mslice(position, length) -> result {\n  if gt(length, 32) { revert(0, 0) } // protect against overflow\n\n  result := div(mload(position), exp(2, sub(256, mul(length, 8))))\n}\n\nlet k := mslice(0, 0) } ", 'mslice injection');
  t.equal(print(compile(` code { let k := true let b := false } `).results),
    ` code { let k := 0x01 let b := 0x00 } `, 'boolean');
  t.equal(print(compile(` code { require(45) } `).results),
    " code { \nfunction mslice(position, length) -> result {\n  if gt(length, 32) { revert(0, 0) } // protect against overflow\n\n  result := div(mload(position), exp(2, sub(256, mul(length, 8))))\n}\n\n\nfunction require(arg) {\n  if lt(arg, 1) {\n    revert(0, 0)\n  }\n}\nrequire(45) } ", 'require method injection');
  t.equal(print(compile(` code {  } `).results),
    " code {  } ", 'empty code');
  t.equal(print(compile(` code { let n := sig"function nick()" } `).results),
    " code { let n := 0x7d4fcb1f } ", 'signature injection');
  t.equal(print(compile(` code { let n := topic"event nick()" } `).results),
    " code { let n := 0x7d4fcb1f143539d746fdb2795d620433c7c91f8298cb94475bb23e4fb2361113 } ", 'event injection');
  t.equal(print(compile(` code {
    mstore(0, 3, 5, 10)
  } `).results),
    " code {  } ", 'specialized mstore');
  t.equal(print(compile(` code {
    mstore( 0,3,5,10)
  } `).results),
    " code {  } ", 'specialized mstore');
  t.equal(print(compile(` code {
    mstore( 0,3,5)
  } `).results),
    " code {  } ", 'specialized mstore');
  t.equal(print(compile(` code {
    mstore( mload(add(32, 22)),3,5,10,mload(2))
  } `).results),
    " code {  } ", 'specialized mstore');
  t.equal(print(compile(` code {
    mstore( 0,mload(3))
  } `).results),
    " code {\n    mstore( 0,mload(3))\n  } ", 'specialized mstore');

});
