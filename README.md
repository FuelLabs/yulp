Yul+
===

![Node.js CI](https://github.com/FuelLabs/yulp/workflows/Node.js%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/yulp.svg)](https://badge.fury.io/js/yulp)

A low-level, highly efficient extension to Yul, an intermediate smart-contract language for the Ethereum Virtual Machine.

[Try it Now!](https://yulp.fuel.sh)

# Features
- All existing Yul features
- Memory structures (`mstruct`)
- Enums (`enum`)
- Constants (`const`)
- Ethereum standard ABI signature/topic generation (`sig"function ..."`, `topic"event ...`)
- Booleans (`true`, `false`)
- Safe math (over/under flow protection for addition, subtraction, multiplication)
- Injected methods (`mslice` and `require`)

# Coming Soon
- Static typing
- CLI support

# Installing

```sh
npm install yulp
```

# Building From Source

```sh
npm install
npm run build
npm test
```

# Library Usage

## Code Example

```js
const yulp = require('../index');
const source = yulp.compile(`

object "SimpleStore" {
  code {
    datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
    return(0, datasize("Runtime"))
  }
  object "Runtime" {
    code {
      calldatacopy(0, 0, 36) // write calldata to memory

      mstruct StoreCalldata( // Custom addressable calldata structure
        sig: 4,
        val: 32
      )

      switch StoreCalldata.sig(0) // select signature from memory (at position 0)

      case sig"function store(uint256 val)" { // new signature method
        sstore(0, StoreCalldata.val(0)) // sstore calldata value
        log2(0, 0, topic"event Store(uint256 value)", StoreCalldata.val(0))
      }

      case sig"function get() returns (uint256)" {
        mstore(100, sload(0))
        return (100, 32)
      }
    }
  }
}

`);

console.log(yulp.print(source.results));
```

## Enums

Here we have a fully featured `enum` identifier which acts as a constant.

```js
object "contract" {
  code {
    enum Colors (
      Red,
      Blue,
      Green
    )

    log1(0, 0, Colors.Green) // logs 2 as a topic
  }
}
```

## Constants

`const` will define a `let` variable value that cannot be re-assigned.

```js
object "contract" {
  code {
    const firstVar := 0xaa
    const someOther := 1
  }
}
```

## Memory Slice

`mslice(position, length)` will return a 1-32 byte value from memory.

```js
object "contract" {
  code {
    mstore(30, 0xaaaa)

    log1(0, 0, mslice(30, 2)) // will log 0xaaaa
  }
}
```

## Booleans

`true` and `false` are added and equate to values `0x01` and `0x00`.

```js
object "contract" {
  code {
    mstore(30, true)

    log1(0, 0, mload(30)) // will log 0x01
  }
}
```

## Multi mstore sugar

`mstore` can now be used as a proxy method

```js
object "contract" {
  code {
    mstore(30, 1, 2, 3, 4)

    /*
    mstore(30, 1)
    mstore(add(30, 32), 2)
    mstore(add(30, 64), 3)
    mstore(add(30, 96), 4)
    */
  }
}
```

## Comparison Methods

`lte`, `gte`, `neq` can now be used.

```
if and(lte(1, 10), gte(5, 2)) {
  let k := neq(0, 1)
}
```

## MAX_UINT

`MAX_UINT` literal is now available (i.e. `uint(-1)`)

```
if lt(v, MAX_UINT) {
  let k := 1
}
```

## Ethereum Standard ABI Signature and Topic Generation

`sig" [ method abi ] "` will equate to a 4 byte method signature hex value

`topic" [ event abi definition ] "` will equate to the 32 byte topic hash

```js
object "contract" {
  code {
    const storeSig := sig"function store(uint256 val)"
    const eventSig := topic"event Store (uint256 indexed val)"

    log1(0, 0, storeSig) // will log 0x6057361d

    log1(0, 0, eventSig) // will log 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
  }
}
```

## Memory Structures

Memory structures enable better handling of pre-existing in-memory structures.

`mstruct Identifier ( [ property, ... ] )`

A structure property is defined by an identifier and length specifier (i.e. `blockProducer:32`) where the identifier is `blockProducer` and the length is `32 bytes`.

In-memory array like structures are defined using a `name.length` property, followed by a `name:[array item size]` property.

Note, `mstruct` properties allow for data chunk sizes up to 32 bytes only.

## Inheritance

```js
object "Utils" {
  code {
    const Size := 1

    function someMethod() -> {}
  }
}

object "SimpleStore" is "Utils" {
  code {
    mstore(0, Size)
    someMethod()
  }
}
```

## Imports

We now support basic file system usage, we don't support local path resolution just yet.

The `fs` object is simply supplied at `compile`: `yulp.compile(source, fs)`.

```js
import "./Utils.yulp"

object "SimpleStore" is "Utils" {
  ...
}
```

## Error Reporting

A new experimental (post v0.0.7) feature is the `error"some message"` literal.

This simply utf8 encodes the message to bytes, keccak256 hashes it and returns the first 4 bytes as an error identifier.

The compiler will return an `errors` property (`{ [4 byte idenfitier]: [error message], ... }`).

```js
object "contract" {
  code {
    // example structure in memory of a BlockHeader starting at mem. position 400
    mstore(400, 0xaa) // block producer
    mstore(432, 0xbb) // previous block hash
    mstore(464, 0xcc) // block height
    mstore(496, 0x03) // length of anotherArray (i.e. 3 array items)
    mstore(554, 0xaaaabbbbcccc) // array with 3 elements, 0xaaaa, 0xbbbb, 0xcccc
    mstore(560, 0xdd) // Ethereum block number
    mstore(592, 0x01) // transaction roots array length
    mstore(652, 0xffffffff) // transaction roots, one 4 byte item 0xffffffff

    mstruct BlockHeader (
      blockProducer: 32,
      previousBlockHash: 32,
      blockHeight: 32,
      anotherArray.length: 32,
      anotherArray: [2],
      ethereumBlockNumber: 32,
      roots.length: 32,
      roots: [4]
    )

    BlockHeader.blockProducer(400) // will return 0xaa
    BlockHeader.blockProducer.size() // will return 32

    BlockHeader.blockHeight(400) // will return block height 0xcc
    BlockHeader.blockHeight.offset(400) // will return pos + length
    BlockHeader.blockHeight.position(400) // will return pos
    BlockHeader.blockHeight.size() // 32
    BlockHeader.blockHeight.index() // 2
    BlockHeader.blockHeight.keccak256(500) // keccak256 hash the block height

    BlockHeader.anotherArray(400, 2) // will return anotherArray item 0xcccc

    BlockHeader.size(400) // will return the size of the entire struct
    BlockHeader.offset(400) // will return entire offset position of the struct pos + length
    BlockHeader.keccak256(400) // keccak256 hash the entire block header
  }
}
```

# Helping Out

There is always a lot of work to do, and will have many rules to maintain. So please help out in any way that you can:

- Improve documentation.
- Chime in on any open issue or pull request.
- Open new issues about your ideas for making `yulp` better, and pull requests to show us how your idea works.
- Add new tests to *absolutely anything*.
- Create or contribute to ecosystem tools.
- Spread the word!

We communicate via [issues](https://github.com/fuellabs/yulp/issues) and [pull requests](https://github.com/fuellabs/yulp/pulls).

# Donating

Please consider donating if you think Yul+ is helpful to you or that my work is valuable. We are happy if you can help us buy a cup of coffee. ❤️

- [Gitcoin grant page](https://gitcoin.co/grants/199/fuel-labs)

Or just send us some *Dai*, *USDC* or *Ether*:

- [**0x3e947a271a37Ae7B59921c57be0a3246Ee0d887C**](https://etherscan.io/address/0x3e947a271a37Ae7B59921c57be0a3246Ee0d887C)

# Coming Soon

```js
mstruct BasicRecursiveStructures ( // better structure description
  block: BlockHeader,
  root: RootHeader,
  proof: MerkleProof,
  leaf: TransactionLeaf,
  token: 32
)

mstruct SwitchStatements ( // special switch case
  data.switch: 1, // switch 0, 1, 2 for options below
  data: [InputUTXO,InputHTLC,TransactionDeposit]
)

mstruct FixedLengthArrays ( // special switch case
  someArr: (7)[32],
)
```
