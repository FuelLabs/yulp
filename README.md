# Yul Plus

[![npm version](https://badge.fury.io/js/yulp.svg)](https://badge.fury.io/js/yulp)

A low-level, highly efficient extension to Yul, an intermediate language for the Ethereum Virtual Machine.

## Features
- All existing Yul features
- Structs
- Enums
- Constants
- Etheruem Standard ABI Signature Generation
- Memory slice
- Booleans

## Install

```sh
npm install --save yulp
```

## Usage

```js
const yulp = require('../index');
const source = yulp.compile(`
object "SimpleStore" {
  code {
    // constructor code
    datacopy(0, dataoffset("Runtime"), datasize("Runtime"))  // runtime code
    return(0, datasize("Runtime"))
  }
  object "Runtime" {
    code {
      calldatacopy(0, 0, 36) // copy calldata to memory
      switch slice(0, 4) // Sliced 4 byte method signature

      case sig"function store(uint256 val)" {
        sstore(0, mload(4))
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

## Help out

There is always a lot of work to do, and will have many rules to maintain. So please help out in any way that you can:

- Create, enhance, and debug fuel-core rules (see our guide to ["Working on rules"](./.github/CONTRIBUTING.md)).
- Improve documentation.
- Chime in on any open issue or pull request.
- Open new issues about your ideas for making `fuel-core` better, and pull requests to show us how your idea works.
- Add new tests to *absolutely anything*.
- Create or contribute to ecosystem tools.
- Spread the word!

We communicate via [issues](https://github.com/fuellabs/fuel-core/issues) and [pull requests](https://github.com/fuellabs/fuel-core/pulls).

## Important documents

- [Changelog](CHANGE_LOG.md)
- [License](https://raw.githubusercontent.com/fuellabs/fuel-core/master/LICENSE)

## Licence

This project is licensed under the Apache-2.0 license, Copyright (c) 2020 Fuel labs. For more information see LICENSE

```
Copyright 2020 Fuel Labs

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
