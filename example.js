const yulp = require('./index');
const source = yulp.compile(`
  // hello
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

    const nick, cool := 0x1

    nick := 0x3

    function selectAndVerifyInputDeposit(input, witnessesLength) -> length,
      depositHashID, witnessReference {
        const insideMethod := nick
    }

    const hello := nick

    function /* dffds */ nick() {

    }
  }
  `);

console.log(yulp.print(source.results));
