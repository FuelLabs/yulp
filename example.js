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

    const hello := topic"event Cool()"

    nick := sig"function name()"

    what := true

    function selectAndVerifyInputDeposit(input, witnessesLength) -> length,
      depositHashID, witnessReference {
        const insideMethod := mslice(0, 23)
    }

    gh()

    for {} eq(1, false) {} {
      // hello
    }

    function /* dffds */ nick() {

    }
  }
  `);

console.log(yulp.print(source.results));
