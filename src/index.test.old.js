
    /*
  t.equal(print(compile(`object "SimpleStore" { code { const nick, cool := 0 } } `).results),
    " code {  } ", 'const');
  t.equal(print(compile(`object "SimpleStore" { code { const nick := 0xaaa } }`).results), " code {  } ", 'const');
  t.throws(() => print(compile(` object "SimpleStore" { code { const nick := 0xaaa const nick := 1 } } `).results), 'const dub check');
  t.throws(() => print(compile(` object "SimpleStore" {code { const nick := 0xaaa nick := 1 } `).results), 'const dub check');
  t.throws(() => print(compile(` object "SimpleStore" {code { const nick := 0xaaa nick := 22 } `).results), 'const assignment check');
  t.equal(print(compile(` object "SimpleStore" {code { enum Colors (red, blue, green) let k := Colors.blue } `).results),
    ` object "SimpleStore" {code {  let k := 1 } `, 'enum');
  t.equal(print(compile(` object "SimpleStore" {code { enum Colors () } `).results),
    ` code {  } `, 'empty enum');
  t.equal(print(compile(` object "SimpleStore" {code { let k := mslice(0, 0) } `).results),
    " code {\nfunction mslice(position, length) -> result {\n  if gt(length, 32) { revert(0, 0) } // protect against overflow\n\n  result := div(mload(position), exp(2, sub(256, mul(length, 8))))\n}\n\n let k := mslice(0, 0) } ", 'mslice injection');
  t.equal(print(compile(` object "SimpleStore" {code { let k := true let b := false } `).results),
    ` code { let k := 0x01 let b := 0x00 } `, 'boolean');
  t.equal(print(compile(` object "SimpleStore" {code { require(45) } `).results),
    " code {\nfunction require(arg) {\n  if lt(arg, 1) {\n    revert(0, 0)\n  }\n}\n require(45) } ", 'require method injection');
  t.equal(print(compile(` code {  } `).results),
    " code {  } ", 'empty code');
  t.equal(print(compile(` code { let n := sig"function nick()" } `).results),
    " code { let n := 0x7d4fcb1f } ", 'signature injection');
  t.equal(print(compile(` code { let n := topic"event nick()" } `).results),
    " code { let n := 0x7d4fcb1f143539d746fdb2795d620433c7c91f8298cb94475bb23e4fb2361113 } ", 'event injection');
  t.equal(print(compile(` code {
    mstore(0, 3, 5, 10)
  } `).results),
    " code {\n    mstore(0, 3) mstore(add(0,32), 5) mstore(add(0,64), 10)\n  } ", 'specialized mstore');
  t.equal(print(compile(` code {
    mstore( 0,3,5,10)
  } `).results),
    " code {\n    mstore( 0,3) mstore( add(0,32),5) mstore( add(0,64),10)\n  } ", 'specialized mstore');
  t.equal(print(compile(` code {
    mstore( 0,3,5)
  } `).results),
    " code {\n    mstore( 0,3) mstore( add(0,32),5)\n  } ", 'specialized mstore');
  t.equal(print(compile(` code {
    mstore( mload(add(32, 22)),3,5,10,mload(2))
  } `).results),
    " code {\n        function safeAdd(x, y) -> z {\n          z := add(x, y)\n          require(or(eq(z, x), gt(z, x)))\n        }\n        \n        function safeSub(x, y) -> z {\n          z := sub(x, y)\n          require(or(eq(z, x), lt(z, x)))\n        }\n        \n        function safeMul(x, y) -> z {\n          if gt(y, 0) {\n            z := mul(x, y)\n            require(eq(div(z, y), x))\n          }\n        }\n        \n          function safeDiv(x, y) -> z {\n            require(gt(y, 0))\n            z := div(x, y)\n          }\n          \nfunction require(arg) {\n  if lt(arg, 1) {\n    revert(0, 0)\n  }\n}\n\n    mstore( mload(safeAdd(32, 22)),3) mstore( add(mload(safeAdd(32, 22)),32),5) mstore( add(mload(safeAdd(32, 22)),64),10) mstore( add(mload(safeAdd(32, 22)),96),mload(2))\n  } ", 'specialized mstore');
  t.equal(print(compile(` code {
    mstore( 0,mload(3))
  } `).results),
    " code {\n    mstore( 0,mload(3))\n  } ", 'specialized mstore');

  t.equal(print(compile(` code { if lte(1, 1) { log0(0, 0) } } `).results),
    " code {\n  function lte(x, y) -> result {\n    if or(lt(x, y), eq(x, y)) {\n      result := 0x01\n    }\n  }\n   if lte(1, 1) { log0(0, 0) } } ", 'lte');
  t.equal(print(compile(` code { if gte(1, 1) { log0(0, 0) } } `).results),
    " code {\n  function gte(x, y) -> result {\n    if or(gt(x, y), eq(x, y)) {\n      result := 0x01\n    }\n  }\n   if gte(1, 1) { log0(0, 0) } } ", 'gte');
  t.equal(print(compile(` code { if neq(1, 1) { log0(0, 0) } } `).results),
    " code {\n  function neq(x, y) -> result {\n    if not(eq(x, y)) {\n      result := 0x01\n    }\n  }\n   if neq(1, 1) { log0(0, 0) } } ", 'neq');
  t.equal(print(compile(` code { if eq(1, MAX_UINT) { log0(0, 0) } } `).results),
    " code { if eq(1, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff) { log0(0, 0) } } ", 'max_uint');

  t.equal(print(compile(` code {
    if and(eq(0, sig"transfer(uint256)"), eq(3, 1)) {
      log1(0, sig"transfer(bool)", topic"event Nick(uint256)")
    }
  } `).results),
    " code {\n    if and(eq(0, 0x12514bba), eq(3, 1)) {\n      log1(0, 0xac290988, 0x72566f71a6764804fe05acbf51d519980188601a575242e18965e1b97221c2c3)\n    }\n  } ", 'max_uint');

  t.equal(print(compile(` code { let nick := 0xaaa { let jim := 0xbbb } } `).results), " code { let nick := 0xaaa { let jim := 0xbbb } } ", 'unnamed block');

  t.equal(print(compile(` code { require(0, error"nick") } `).results), " code {\nfunction require(arg, message) {\n  if lt(arg, 1) {\n    mstore(0, message)\n    revert(0, 32)\n  }\n}\n require(0, 0x5d5727cb) } ", 'unnamed block');

  compile(`object "SimpleStore" { code {
    const someLiteral := 0x005
    const someOther := sig"hello()"

    enum Numbers (
      zero,
      one
    )

    mstruct testArr (
      q.length: 10,
      q: [3]
    )

    function kind () {
      let test := testArr.q.slice(0)
      let nick := someLiteral
      let cool := someOther
      let another := error"this is an error"

      {
        mstore(someOther, someOther)
      }

      function someOther() {
        let john := error"some error message that is really long"

        switch john
        case Numbers.zero {
        }
        case Numbers.one {
        }
      }
    }
  } } `);
