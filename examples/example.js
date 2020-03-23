const yulp = require('../src/index');
const source = yulp.compile(`
  // hello

  code {
    mslice(3, 3)
  }

  code {
    mstruct K (cool: 2)
    mstruct B()

    K.cool(333)

    K.cool.size()

    K.offset(2)

    const nick := 22
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

    mstruct BlockHeader (
      blockProducer: 32,
      previousBlockHash: 32,
      blockHeight: 32,
      anotherArray.length: 1,
      anotherArray: [23],
      ethereumBlockNumber: 32,
      transactionRoots.length: 32,
      transactionRoots: [32]
    )

    BlockHeader.blockProducer(400)
    BlockHeader.blockProducer.size() // 32

    BlockHeader.blockHeight(400) // will return block height
    BlockHeader.blockHeight.offset(400) // will return pos + length
    BlockHeader.blockHeight.position(400) // will return pos
    BlockHeader.blockHeight.size() // 32
    BlockHeader.blockHeight.index() // 2

    BlockHeader.blockHeight.keccak256(400) // hash the block height

    BlockHeader.transactionRoots.position(0)

    BlockHeader.transactionRoots(400, 2) // return the second root in array

    BlockHeader.size(400) // return entire struct size
    BlockHeader.offset(400) // will produce offset

    let k := BlockHeader.keccak256(400) // hash the entire block header

    enum Colors2Low (
      Red,
      Blue,
      Green
    )

    const nick, cool := add(mul(323), sub(3, 200))

    const hello_ := topic"event Cool()"

    nick, cool2 := sig"function name()"

    what := Colors.Blue

    enum Colors2 (
      hello,
      nick
    )

    function selectAndVerifyInputDeposit(input, witnessesLength) -> length,
      depositHashID, witnessReference {
        const insideMethod := mslice(0, 23)

        mstruct BlockHeader2 (
          nick: 33
        )

        let nick := Colors2.hello

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

// console.log(yulp.print(source.results));
