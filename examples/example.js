const yulp = require('../src/index');
const source = yulp.compile(`
  object "SimpleStore" {
    code {
      datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
      return(0, datasize("Runtime"))
    }
    object "Runtime" {
      code {
        calldatacopy(0, 0, 36) // write calldata to memory

        mstruct Something(
          val: 32
          someArr.length: 12,
          someArr: [10]
        )

        mstruct Calldata(
          cool: 1,
          sig: Something,
          sig2: Something,
          val: 32
        )

        let chunkA := add(pos, 33)
        let chunkB := add(12, mul(10, mslice(chunkA, 12)))
        let finalPos := add(chunkA, chunkB)

        switch Calldata.sig2.position(0) // select signature from memory

        case sig"function store(uint256 val)" { // new signature method
          sstore(0, Calldata.val(0)) // sstore calldata value
        }

        case sig"function get() returns (uint256)" {
          mstore(100, sload(0))
          return (100, 32)
        }
      }
    }
  }
  `);

console.log(yulp.print(source.results));
