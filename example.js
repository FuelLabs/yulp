const yulp = require('./index');
const source = yulp.compile(`
  // hello

  code {
    mslice(3, 3)
  }
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

    enum Colors (
      Red,
      Blue,
      Green
    )

    const nick, cool := 0x1

    const hello := topic"event Cool()"

    nick2, cool2 := sig"function name()"

    what := Colors.Blue

    hello3 := 1

    function selectAndVerifyInputDeposit(input, witnessesLength) -> length,
      depositHashID, witnessReference {
        const insideMethod := mslice(0, 23)

        const hello3 := 2

        enum Enclosed (
          Cool,
          Beans
        )

        let dfsfds := Enclosed.Beans
    }

    gh(Enclosed.Beans)

    for {} eq(1, false) {} {
      // hello
    }

    function /* dffds */ nick() {

    }
  }
  `);

console.log(yulp.print(source.results));
