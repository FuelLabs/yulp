const yulp = require('../src/index');
const source = yulp.compile(`
  object "SimpleStore" {
    code {
      datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
      return(0, datasize("Runtime"))
    }
    object "Runtime" {
      code {
        const a := 0

        function hello() {
          const b := 0
          let n := 1
        }

        function hello2() {
          let k := 1
          const c := 0
        }
      }
    }
  }
  `);

console.log(yulp.print(source.results));
