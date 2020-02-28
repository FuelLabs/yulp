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

    mstruct Nick (
      cool: 11,
      cool2: 0x1,
      another: 14
    )

    function Nick.cool(pos) -> res {
      res := mslice(pos, 11)
    }

    function Nick.cool2(pos) -> res {
      res := mslice(add(pos, add(11, 0)), 0x1)
    }

    Nick.cool2(3)

    enum Colors (
      Red,
      Blue,
      Green
    )

    const nick, cool := 0x1

    const hello_ := topic"event Cool()"

    ni_ck2, cool2 := sig"function name()"

    what := Colors.Blue

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
