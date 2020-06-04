const yulp = require('../src/index');
const fs = require('fs');
const source = yulp.compile(`
  import "./another.yulp"
  import "./cool.yulp"

  object "CoolBeans" {
    code {
      function yes() {}
    }
  }

  object "YesSir" is "CoolBeans", "Another" {
    code {
      let b := add(yes(), Nick.cool(0))
      function no() {}
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
          val: 32,
          someArr1.length: 12,
          someArr1: [10],
          john2: 10,
          someArr2.length: 12,
          someArr2: [10],
          cool1: 20,
          someArr3.length: 12,
          someArr3: [10]
        )

        Something.cool1(0)
        Something.someArr3(0)
      }
    }
  }
  `, fs, './examples');

console.log(yulp.print(source.results));
