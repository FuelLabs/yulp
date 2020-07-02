## 0.0.1 -- Yul Plus Launch!

1. Basic testing
2. Basic docs
3. License

## 0.0.2 -- Bug Fix

1. mstruct keccak256 bug fix
2. mstruct requireing methods fix

## 0.0.3 -- Safe Math and Require Injection Fix

1. Only injects methods into code blocks, not blocks

## 0.0.4 -- Fixed array and item hashing in mstruct

1. Fixed array and item hashing in mstruct
2. Added multi mstore
3. mstruct / mslice no longer uses safe math internally
4. testing updated

## 0.0.5 -- Code keyword

1. fixed code keyword usage (i.e. codecopy, calldata)

## 0.0.6 -- Comparison methods and MAX_UINT

1. Comparison methods: lte, gte, neq
2. MAX_UINT (i.e. `uint(-1)`)
3. Compiler now returns signatures and topics used in the contract

  `compile(...).signatures` [ { abi: .., signature: .. }, .. ]
  `compile(...).topics` [ { abi: ..., topic: ... }, .. ]

It will simply return all signatures and topics detected.

Scoping with object names coming soon.
4. signature / topic signature fixes

## 0.0.7 Better Yul support, bugs and truly global constants
1) Better support for no-identifier blocks (i.e. ` code { { .. } { .. } }`)
2) Truly global `const` replacements when the value is a literal, similar to Enum
3) Experimental `error""` literal for error reporting. Can be used to define long string error messages that get compiled down to a 4 byte identifier.

Good for cases like

```
mstore(0, error"this is a really long utf8 encoded error message")
revert(0, 32)
```

Compiler results now have an `.errors` property, with an object `{ [4 byte error hash]: 'error code message' }`.
4) If an array is under 32 bytes, you can now use the quick .slice option as follows:

mstore(0, 0x03aabbccdd)

mstruct ExampleArr (
    val.length: 1,
    val: [1]
)

ExampleArr.val.slice(0) // will return 0xaabbccdd

This is nice for byte array handling, where an mslice will can handle the value.

Note, no error checking is preformed here, the user has to check if the array length is greater than 32 bytes.

## 0.1.0 -- Inheritance

1. Basic Inheritance

```js
object "Nick" {
  code {
    const HelloWorld := 1
  }
}

object "John" is "Nick" {
  code {
    mstore(0, HelloWorld)
  }
}
```

2. Basic Imports using `node` using `fs` API.

Simply provide a `fs` object to the compile for basic imports.

```js
yulp.compile(src);

// with file imports
const fs = require('fs');
yulp.compile(src, fs);
```

3. Error code reporting

```js
require(eq(1, 1), error"one-not-one")
```

4. `mstruct` stack optimizations

## 0.1.0 -- Small Updates and Upgrades

- error hashes are now using a counting nonce (saves many bytes), same error code security
- some mstruct tuning
- updated testing
