# 0.0.1 -- Yul Plus Launch!

1. Basic testing
2. Basic docs
3. License

# 0.0.2 -- Bug Fix

1. mstruct keccak256 bug fix
2. mstruct requireing methods fix

# 0.0.3 -- Safe Math and Require Injection Fix

1. Only injects methods into code blocks, not blocks

# 0.0.4 -- Fixed array and item hashing in mstruct

1. Fixed array and item hashing in mstruct
2. Added multi mstore
3. mstruct / mslice no longer uses safe math internally
4. testing updated

# 0.0.5 -- Code keyword

1. fixed code keyword usage (i.e. codecopy, calldata)

# 0.0.6 -- Comparison methods and MAX_UINT

1. Comparison methods: lte, gte, neq
2. MAX_UINT (i.e. `uint(-1)`)
3. Compiler now returns signatures and topics used in the contract

  `compile(...).signatures` [ { abi: .., signature: .. }, .. ]
  `compile(...).topics` [ { abi: ..., topic: ... }, .. ]

It will simply return all signatures and topics detected.

Scoping with object names coming soon.
