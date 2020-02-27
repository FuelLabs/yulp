const { test } = require('zora');
const { compile, print } = require('./index');

function yulToYulp(source, t) {
  t.equal(print(compile(source).results), source, 'yul to yulp');
}

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

  yulToYulp(`// Code consists of a single object. A single "code" node is the code of the object.
// Every (other) named object or data section is serialized and
// made accessible to the special built-in functions datacopy / dataoffset / datasize
// Access to nested objects can be performed by joining the names using
// The current object and sub-objects and data items inside the current object
// are in scope without nested access.
object "Contract1" {
    code {
        function allocate(size) -> ptr {
            ptr := mload(0x40)
            if iszero(ptr) { ptr := 0x60 }
            mstore(0x40, add(ptr, size))
        }

        // first create "runtime.Contract2"
        let size := datasize("runtime.Contract2")
        let offset := allocate(size)
        // This will turn into a memory->memory copy for eWASM and
        // a codecopy for EVM
        datacopy(offset, dataoffset("runtime.Contract2"), size)
        // constructor parameter is a single number 0x1234
        mstore(add(offset, size), 0x1234)
        pop(create(offset, add(size, 32), 0))

        // now return the runtime object (this is
        // constructor code)
        size := datasize("runtime")
        offset := allocate(size)
        // This will turn into a memory->memory copy for eWASM and
        // a codecopy for EVM
        datacopy(offset, dataoffset("runtime"), size)
        return(offset, size)
    }

    data "Table2" hex"4123"

    object "runtime" {
        code {
            function allocate(size) -> ptr {
                ptr := mload(0x40)
                if iszero(ptr) { ptr := 0x60 }
                mstore(0x40, add(ptr, size))
            }

            // runtime code

            let size := datasize("Contract2")
            let offset := allocate(size)
            // This will turn into a memory->memory copy for eWASM and
            // a codecopy for EVM
            datacopy(offset, dataoffset("Contract2"), size)
            // constructor parameter is a single number 0x1234
            mstore(add(offset, size), 0x1234)
            pop(create(offset, add(size, 32), 0))
        }

        // Embedded object. Use case is that the outside is a factory contract,
        // and Contract2 is the code to be created by the factory
        object "Contract2" {
            code {
                // code here ...
            }

            object "runtime" {
                code {
                    // code here ...
                }
            }

            data "Table1" hex"4123"
        }
    }
}`, t);
});
