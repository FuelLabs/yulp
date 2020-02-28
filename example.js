const yulp = require('./index');
const source = yulp.compile(`
  // hello

  code {
    mslice(3, 3)
  }

  code {
    mstruct K (cool: 2)

    K.cool(333)

    K.cool.size()
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

    Nick.cool(12)

    Nick.cool2.offset(3)

    Nick.another(800)

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

        mstruct Jonny (
          cool: 32,
          yes: 11
        )

        const hello3 := Jonny.yes(122)

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
