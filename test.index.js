const { test } = require('zora');
const { compile, print } = require('./index');

function yulToYul(source, t) {
  t.equal(print(compile(source).results), source, 'yul to yul');
}

test('yulp should be yul', t => {
  yulToYul(`object "SimpleStore" {}`, t);
  yulToYul(`// hello world`, t);
  yulToYul(`/* hello world */`, t);
  yulToYul(`object "SimpleStore" {
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
});
