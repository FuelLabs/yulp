const yulp = require('../src/index');
const fs = require('fs');
const source = yulp.compile(`
  import "./another.yulp"
  import "./cool.yulp"

  object "CoolBeans" {
    code {
      function yes() {}
      require(2, error"dd")
    }
  }

  object "YesSir" is "CoolBeans", "Another" {
    code {
      let b := add(yes(), Nick.cool(0))
      function no() {}
      require(2, error"dd")
    }
  }

  object "SimpleStore" {
    code {
      datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
      return(0, datasize("Runtime"))
    }
    object "Runtime" is "YesSir" {
      code {
        calldatacopy(0, 0, 36) // write calldata to memory

        mstruct Something(
          val: uint64,
          someArr1.length: bytes12,
          someArr1: [uint256],
          john2: address,
          someArr2.length: bytes12,
          someArr2: [10],
          cool1: address,
          someArr3.length: bytes12,
          someArr3: [bytes10]
        )

        let address45 := 22

        Something.cool1(address())
        Something.someArr3(0)

        require(2, error"nick")
        require(2, error"john")
      }
    }
  }
  `, fs, './examples');

console.log(yulp.print(source.results), source);
