const yulp = require('./index');
const source = yulp.compile(`
  // hello

  object "SimpleStore" {
    object "Nick" {}
    code {}
    code  {
      // hello
    }
  }

  object "SimpleStore2" {
    object "Nick" {}
  }

  // hello
  `);

console.log(source.results, yulp.print(source.results));
