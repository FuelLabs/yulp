const yulp = require('./index');
const source = yulp.compile(`
  code {
      // Assign all calldata into free memory, remove 4 byte signature and 64 bytes size/length data (68 bytes)
      // Note, We only write data to memory once, than reuse it for almost every function for better computational efficiency
      calldatacopy(Calldata_MemoryPosition, 68, calldatasize())

      // Assign fresh memory pointer to Virtual Stack
      mpush(Stack_FreshMemory, add3(Calldata_MemoryPosition, calldatasize(), mul32(2)))

      // Handle Proof Type
      switch selectProofType()

      case 0 { // ProofType_MalformedBlock
          verifyBlockProof()
      }

      case 1 { // ProofType_MalformedTransaction
          // Check proof lengths for overflow
          verifyTransactionProofLengths(OneProof)

          // Verify Malformed Transaction Proof
          verifyTransactionProof(FirstProof, No_UTXOProofs, Not_Finalized)
      }

      case 2 { // ProofType_InvalidTransaction
          // Check proof lengths for overflow
          verifyTransactionProofLengths(OneProof)

          // Check for Invalid Transaction Sum Amount Totals
          // Check for HTLC Data Construction / Witness Signature Specification
          verifyTransactionProof(FirstProof, Include_UTXOProofs, Not_Finalized)
      }

      case 3 { // ProofType_InvalidTransactionInput
          // Check proof lengths for overflow
          verifyTransactionProofLengths(TwoProofs)

          // Check for Invalid UTXO Reference (i.e. Reference a UTXO that does not exist or is Invalid!)
          verifyTransactionProof(FirstProof, No_UTXOProofs, Not_Finalized) // Fraud Tx
          verifyTransactionProof(SecondProof, No_UTXOProofs, Not_Finalized) // Valid Tx

          // Select Input Type
          let firstInputType := selectInputType(selectInputSelected(FirstProof))

          // Assert fraud input is not a Deposit Type (deposits are checked in verifyTransactionProof)
          assertOrInvalidProof(iszero(eq(firstInputType, InputType_Deposit)),
            ErrorCode_InvalidTypeDeposit)

          // Fraud Tx 0 Proof: Block Height, Root Index, Tx Index Selected by Metadata
          let firstMetadataBlockHeight, firstMetadataTransactionRootIndex,
            firstMetadataTransactionIndex, firstMetadataOutputIndex := selectMetadata(
              selectMetadataSelected(FirstProof))

          // Ensure block heights are the same Metadata Block Height = Second Proof Block Height
          assertOrInvalidProof(eq(firstMetadataBlockHeight,
            selectBlockHeight(selectBlockHeader(SecondProof))),
            ErrorCode_InvalidBlockHeightReference)

          // Check transaction root index overflow Metadata Roots Index < Second Proof Block Roots Length
          assertOrFraud(lt(firstMetadataTransactionRootIndex,
              selectTransactionRootsLength(selectBlockHeader(SecondProof))),
            FraudCode_InvalidTransactionRootIndexOverflow)

          // Check transaction roots
          assertOrInvalidProof(eq(firstMetadataTransactionRootIndex,
            selectTransactionRootIndex(selectTransactionRoot(SecondProof))),
            ErrorCode_InvalidTransactionRootReference)

          // Check transaction index overflow
          // Second Proof is Leftish (false if Rightmost Leaf in Merkle Tree!)
          let secondProofIsLeftish := mstack(Stack_MerkleProofLeftish)

          // Enforce transactionIndexOverflow
          assertOrFraud(or(
              secondProofIsLeftish,
              lte(firstMetadataTransactionIndex, selectTransactionIndex(selectTransactionData(SecondProof))) // Or is most right!
          ), FraudCode_TransactionIndexOverflow)

          // Check transaction index
          assertOrInvalidProof(eq(firstMetadataTransactionIndex,
              selectTransactionIndex(selectTransactionData(SecondProof))),
            ErrorCode_InvalidTransactionIndexReference)

          // Check that second transaction isn't empty
          assertOrFraud(gt(constructTransactionLeafHash(selectTransactionData(SecondProof)), 0),
            FraudCode_TransactionHashZero)

          // Select Lengths and Use Them as Indexes (let Index = Length; lt; Index--)
          let transactionLeafData, inputsLength,
            secondOutputsLength, witnessesLength := selectAndVerifyTransactionDetails(selectTransactionData(SecondProof))

          // Check output selection overflow
          assertOrFraud(lt(firstMetadataOutputIndex, secondOutputsLength),
            FraudCode_MetadataOutputIndexOverflow)

          // Second output index
          let secondOutputIndex := selectOutputIndex(selectTransactionData(SecondProof))

          // Check outputs are the same
          assertOrInvalidProof(eq(firstMetadataOutputIndex, secondOutputIndex),
            ErrorCode_InvalidOutputIndexReference)

          // Select second output
          let secondOutput := selectOutputSelected(SecondProof)
          let secondOutputType := selectOutputType(secondOutput)

          // Check output is not spending withdrawal
          assertOrFraud(iszero(eq(secondOutputType, OutputType_withdrawal)),
            FraudCode_InvalidInputWithdrawalSpend)

          // Invalid Type Spend
          assertOrFraud(eq(firstInputType, secondOutputType),
            FraudCode_InvalidTypeReferenceMismatch)

          // Construct second transaction hash id
          let secondTransactionHashID := constructTransactionHashID(selectTransactionData(SecondProof))

          // Construct Second UTXO ID Proof
          let secondUTXOProof := constructUTXOProof(secondTransactionHashID,
              selectOutputIndex(selectTransactionData(SecondProof)),
              selectOutputSelected(SecondProof))
          let secondUTXOID := constructUTXOID(secondUTXOProof)

          // Select first UTXO ID
          let firstUTXOID := selectUTXOID(selectInputSelected(FirstProof))

          // Check UTXOs are the same
          assertOrFraud(eq(firstUTXOID, secondUTXOID),
            FraudCode_InvalidUTXOHashReference)

          // Handle Change Input Enforcement
          if eq(selectOutputType(secondOutput), OutputType_Change) {
            // Output HTLC
            let length, amount, ownerAsWitnessIndex,
              tokenID := selectAndVerifyOutput(secondOutput, True)

            // Return Witness Recovery
            // Return Witness Signature
            let outputWitnessSignature := selectWitnessSignature(selectTransactionWitnesses(selectTransactionData(SecondProof)),
              ownerAsWitnessIndex)

            // Construct Second Transaction Hash ID
            let outputTransactionHashID := constructTransactionHashID(selectTransactionData(SecondProof))

            // Get Witness Signature
            let outputWitnessAddress := ecrecoverPacked(outputTransactionHashID,
              outputWitnessSignature)


            // Spender Witness Recovery
            // Select First Proof Witness Index from Input
            let unused1, unused2, spenderWitnessIndex := selectAndVerifyInputUTXO(selectInputSelected(FirstProof),
              TransactionLengthMax)

            // Spender Witness Signature
            let spenderWitnessSignature := selectWitnessSignature(selectTransactionWitnesses(selectTransactionData(FirstProof)),
              spenderWitnessIndex)

            // Construct First Tx ID
            let spenderTransactionHashID := constructTransactionHashID(selectTransactionData(FirstProof))

            // Spender Witness Address
            let spenderWitnessAddress := ecrecoverPacked(spenderTransactionHashID,
                spenderWitnessSignature)


            // Assert Spender must be Output Witness
            assertOrFraud(eq(spenderWitnessAddress, outputWitnessAddress),
              FraudCode_InvalidChangeInputSpender)
          }

          // Handle HTLC Input Enforcement
          if eq(selectOutputType(secondOutput), OutputType_HTLC) {
            // Output HTLC
            let length, amount, owner, tokenID,
              digest, expiry, returnWitnessIndex := selectAndVerifyOutputHTLC(secondOutput,
                TransactionLengthMax)

            // Handle Is HTLC Expired, must be returnWitness
            if gte(selectBlockHeight(selectBlockHeader(FirstProof)), expiry) {
                // Return Witness Recovery
                // Return Witness Signature
                let returnWitnessSignature := selectWitnessSignature(selectTransactionWitnesses(selectTransactionData(SecondProof)),
                  returnWitnessIndex)

                // Construct Second Transaction Hash ID
                let returnTransactionHashID := constructTransactionHashID(selectTransactionData(SecondProof))

                // Get Witness Signature
                let returnWitnessAddress := ecrecoverPacked(returnTransactionHashID,
                  returnWitnessSignature)


                // Spender Witness Recovery
                // Select First Proof Witness Index from Input
                let unused1, unused2, inputWitnessIndex, preImage := selectAndVerifyInputHTLC(selectInputSelected(FirstProof),
                  TransactionLengthMax)

                // Spender Witness Signature
                let spenderWitnessSignature := selectWitnessSignature(selectTransactionWitnesses(selectTransactionData(FirstProof)),
                  inputWitnessIndex)

                // Construct First Tx ID
                let spenderTransactionHashID := constructTransactionHashID(selectTransactionData(FirstProof))

                // Spender Witness Address
                let spenderWitnessAddress := ecrecoverPacked(spenderTransactionHashID,
                    spenderWitnessSignature)


                // Assert Spender must be Return Witness!
                assertOrFraud(eq(spenderWitnessAddress, returnWitnessAddress),
                  FraudCode_InvalidReturnWitnessNotSpender)
            }
         }
      }

      case 4 { // ProofType_InvalidTransactionDoubleSpend
          // Check proof lengths for overflow
          verifyTransactionProofLengths(TwoProofs)

          // Check for Invalid Transaction Double Spend (Same Input Twice)
          verifyTransactionProof(FirstProof, No_UTXOProofs, Not_Finalized) // Accused Fraud Tx
          verifyTransactionProof(SecondProof, No_UTXOProofs, Not_Finalized) // Valid Tx

          // Get transaction data zero and 1
          let transaction0 := selectTransactionData(FirstProof)
          let transaction1 := selectTransactionData(SecondProof)

          // Block Height Difference
          let blockHeightDifference := iszero(eq(selectBlockHeight(selectBlockHeader(FirstProof)),
            selectBlockHeight(selectBlockHeader(SecondProof))))

          // Transaction Root Difference
          let transactionRootIndexDifference := iszero(eq(selectTransactionRootIndex(selectTransactionRoot(FirstProof)),
            selectTransactionRootIndex(selectTransactionRoot(SecondProof))))

          // Transaction Index Difference
          let transactionIndexDifference := iszero(eq(selectTransactionIndex(transaction0),
            selectTransactionIndex(transaction1)))

          // Transaction Input Index Difference
          let transactionInputIndexDifference := iszero(eq(selectInputIndex(transaction0),
            selectInputIndex(transaction1)))

           // Check that the transactions are different
          assertOrInvalidProof(or(
            or(blockHeightDifference, transactionRootIndexDifference),
            or(transactionIndexDifference, transactionInputIndexDifference) // Input Index is Different
          ), ErrorCode_InvalidTransactionComparison)

          // Assert Inputs are Different OR FRAUD Double Spend!
          assertOrFraud(iszero(eq(selectInputSelectedHash(FirstProof),
            selectInputSelectedHash(SecondProof))),
              FraudCode_InputDoubleSpend)
      }

      case 5 { // ProofType_UserWithdrawal
          // Check proof lengths for overflow
          verifyTransactionProofLengths(OneProof)

          // Verify transaction proof
          verifyTransactionProof(FirstProof, No_UTXOProofs, Is_Finalized)

          // Run the withdrawal Sequence
          let output := selectOutputSelected(FirstProof)
          let length, outputAmount, outputOwner, outputTokenID := selectAndVerifyOutput(output, False)

          // Check Proof Type is Correct
          assertOrInvalidProof(eq(selectOutputType(output), 1), ErrorCode_InvalidWithdrawalOutputType)

          // Check Proof Type is Correct
          assertOrInvalidProof(eq(outputOwner, caller()), ErrorCode_InvalidWithdrawalOwner)

          // Get transaction details
          let transactionRootIndex := selectTransactionRootIndex(selectTransactionRoot(FirstProof))
          let transactionLeafHash := constructTransactionLeafHash(selectTransactionData(FirstProof))
          let outputIndex := selectOutputIndex(selectTransactionData(FirstProof))
          let blockHeight := selectBlockHeight(selectBlockHeader(FirstProof))

          // Construct withdrawal hash id
          let withdrawalHashID := constructWithdrawalHashID(transactionRootIndex,
            transactionLeafHash, outputIndex)

          // This output has not been withdrawn yet!
          assertOrInvalidProof(eq(getWithdrawals(blockHeight, withdrawalHashID), False),
            ErrorCode_WithdrawalAlreadyHappened)

          // withdrawal Token
          let withdrawalToken := selectWithdrawalToken(FirstProof)

          // Transfer amount out
          transfer(outputAmount, outputTokenID, withdrawalToken, outputOwner)

          // Set withdrawals
          setWithdrawals(blockHeight, withdrawalHashID, True)

          // Construct Log Data for withdrawal
          mstore(mul32(1), withdrawalToken)
          mstore(mul32(2), outputAmount)
          mstore(mul32(3), transactionRootIndex)
          mstore(mul32(4), outputIndex)
          mstore(mul32(5), constructTransactionHashID(selectTransactionData(FirstProof)))
          // add transactionHash

          // Log withdrawal data and topics
          log4(mul32(1), mul32(5), WithdrawalEventTopic, outputOwner,
            blockHeight, transactionLeafHash)
      }

      case 6 { // ProofType_BondWithdrawal
          // Select proof block header
          let blockHeader := selectBlockHeader(FirstProof)

          // Setup block producer withdrawal hash ID (i.e. Zero)
          let withdrawalHashID := 0

          // Transaction Leaf Hash (bond withdrawal hash is zero)
          let transactionLeafHash := 0

          // Block Producer
          let blockProducer := caller()

          // block height
          let blockHeight := selectBlockHeight(blockHeader)

          // Verify block header proof is finalized!
          verifyBlockHeader(blockHeader, Is_Finalized)

          // Assert Caller is Block Producer
          assertOrInvalidProof(eq(selectBlockProducer(blockHeader), blockProducer),
              ErrorCode_BlockProducerNotCaller)

          // Assert Block Bond withdrawal has not been Made!
          assertOrInvalidProof(eq(getWithdrawals(blockHeight, withdrawalHashID), False),
              ErrorCode_BlockBondAlreadyWithdrawn)

          // Transfer Bond Amount back to Block Producer
          transfer(BOND_SIZE, EtherToken, EtherToken, blockProducer)

          // Set withdrawal
          setWithdrawals(blockHeight, withdrawalHashID, True)

          // Construct Log Data for withdrawal
          mstore(mul32(1), EtherToken)
          mstore(mul32(2), BOND_SIZE)
          mstore(mul32(3), 0)
          mstore(mul32(4), 0)

          // Log withdrawal data and topics
          log4(mul32(1), mul32(4), WithdrawalEventTopic, blockProducer,
            blockHeight,
            transactionLeafHash)
      }

      // Invalid Proof Type
      default { assertOrInvalidProof(0, ErrorCode_InvalidProofType) }

      // Ensure Execution Stop
      stop()

      //
      // VERIFICATION METHODS
      // For verifying proof data and determine fraud or validate withdrawals
      //

      // Verify Invalid Block Proof
      function verifyBlockProof() {
          /*
          Block Construction Proof:
              - Type
              - Lengths
              - BlockHeader
              - TransactionRootHeader
              - TransactionRootData
          */

          // Start Proof Position past Proof Type
          let proofMemoryPosition := safeAdd(Calldata_MemoryPosition, mul32(1))

          // Select Proof Lengths
          let blockHeaderLength := load32(proofMemoryPosition, 0)
          let transactionRootLength := load32(proofMemoryPosition, 1)
          let transactionsLength := load32(proofMemoryPosition, 2)

          // Verify the Lengths add up to calldata size
          verifyProofLength(add4(mul32(3), blockHeaderLength,
            transactionRootLength, transactionsLength))

          // Select Proof Memory Positions
          let blockHeader := selectBlockHeader(FirstProof)
          let transactionRoot := selectTransactionRoot(FirstProof)

          // Transactions are After Transaction Root, Plus 64 Bytes (for bytes type metadata from ABI Encoding)
          let transactions := safeAdd(transactionRoot, transactionRootLength)

          // Verify Block Header
          verifyBlockHeader(blockHeader, Not_Finalized)

          // Verify Transaction Root Header
          verifyTransactionRootHeader(blockHeader, transactionRoot)

          // Get solidity abi encoded length for transactions blob
          let transactionABILength := selectTransactionABILength(transactions)

          // Check for overflow
          assertOrInvalidProof(lt(transactionABILength, transactionsLength),
            ErrorCode_InvalidTransactionsABILengthOverflow)

          // Verify Transaction Hash Commitment
          verifyTransactionRootData(transactionRoot,
            selectTransactionABIData(transactions),
            transactionABILength)
      }

      // Verify proof length for overflows
      function verifyProofLength(proofLengthWithoutType) {
        let calldataMetadataSize := 68
        let typeSize := mul32(1)
        let computedCalldataSize := add3(calldataMetadataSize, typeSize, proofLengthWithoutType)

        // Check for overflow
        assertOrInvalidProof(eq(computedCalldataSize, calldatasize()),
          ErrorCode_ProofLengthOverflow)
      }

      // Verify Block Header
      function verifyBlockHeader(blockHeader, assertFinalized) {
          /*
          - Block Header:
            - blockProducer [32 bytes] -- padded address
            - previousBlockHash [32 bytes]
            - blockHeight [32 bytes]
            - ethereumBlockNumber [32 bytes]
            - transactionRoots [64 + dynamic bytes]
          */

          // Construct blockHash from Block Header
          let blockHash := constructBlockHash(blockHeader)

          // Select BlockHeight from Memory
          let blockHeight := selectBlockHeight(blockHeader)

          // Previous block hash
          let previousBlockHash := selectPreviousBlockHash(blockHeader)

          // Transaction Roots Length
          let transactionRootsLength := selectTransactionRootsLength(blockHeader)

          // Assert Block is not Genesis
          assertOrInvalidProof(gt(blockHeight, GenesisBlockHeight), ErrorCode_BlockHeightUnderflow)

          // Assert Block Height is Valid (i.e. before tip)
          assertOrInvalidProof(lte(blockHeight, getBlockTip()), ErrorCode_BlockHeightOverflow)

          // Assert Previous Block Hash
          assertOrInvalidProof(eq(getBlockCommitments(safeSub(blockHeight, 1)), previousBlockHash), ErrorCode_InvalidPreviousBlockHash)

          // Transactions roots length underflow
          assertOrInvalidProof(gt(transactionRootsLength, 0), ErrorCode_TransactionRootsLengthUnderflow)

          // Assert Block Commitment Exists
          assertOrInvalidProof(eq(getBlockCommitments(blockHeight), blockHash), ErrorCode_BlockHashNotFound)

          // If requested, Assert Block is Finalized
          if eq(assertFinalized, 1) {
            assertOrInvalidProof(gte(
              number(),
              safeAdd(selectEthereumBlockNumber(blockHeader), FINALIZATION_DELAY) // ethBlock + delay
            ), ErrorCode_BlockNotFinalized)
          }

          // If requested, Assert Block is Not Finalized
          if iszero(assertFinalized) { // underflow protected!
            assertOrInvalidProof(lt(
              number(), // ethereumBlockNumber
              safeAdd(selectEthereumBlockNumber(blockHeader), FINALIZATION_DELAY) // finalization delay
            ), ErrorCode_BlockFinalized)
          }
      }

      // Verify Transaction Root Header (Assume Block Header is Valid)
      function verifyTransactionRootHeader(blockHeader, transactionRoot) {
        /*
        - Block Header:
          - blockProducer [32 bytes] -- padded address
          - previousBlockHash [32 bytes]
          - blockHeight [32 bytes]
          - ethereumBlockNumber [32 bytes]
          - transactionRoots [64 + dynamic bytes]

        - Transaction Root Header:
          - transactionRootProducer [32 bytes] -- padded address
          - transactionRootMerkleTreeRoot [32 bytes]
          - transactionRootCommitmentHash [32 bytes]
          - transactionRootIndex [32 bytes]
        */

        // Get number of transaction roots
        let transactionRootsLength := selectTransactionRootsLength(blockHeader)

        // Get transaction root index
        let transactionRootIndex := selectTransactionRootIndex(transactionRoot)

        // Assert root index is not overflowing
        assertOrInvalidProof(lt(transactionRootIndex, transactionRootsLength), ErrorCode_TransactionRootIndexOverflow)

        // Assert root invalid overflow
        assertOrInvalidProof(lt(transactionRootsLength, TRANSACTION_ROOTS_MAX), ErrorCode_TransactionRootsLengthOverflow)

        // Construct transaction root
        let transactionRootHash := keccak256(transactionRoot, mul32(3))

        // Assert transaction root index is correct!
        assertOrInvalidProof(eq(
          transactionRootHash,
          load32(blockHeader, safeAdd(6, transactionRootIndex)) // blockHeader transaction root
        ), ErrorCode_TransactionRootHashNotInBlockHeader)
      }

      // Construct commitment hash
      function constructCommitmentHash(transactions, transactionsLength) -> commitmentHash {
        commitmentHash := keccak256(transactions, transactionsLength)
      }

      function selectTransactionABIData(transactionsABIEncoded) -> transactions {
        transactions := safeAdd(transactionsABIEncoded, mul32(2))
      }

      function selectTransactionABILength(transactionsABIEncoded) -> transactionsLength {
        transactionsLength := load32(transactionsABIEncoded, 1)
      }

      // Verify Transaction Root Data is Valid (Assuming Transaction Root Valid)
      function verifyTransactionRootData(transactionRoot, transactions, transactionsLength) {
          // Select Transaction Data Root
          let commitmentHash := selectCommitmentHash(transactionRoot)

          // Check provided transactions data! THIS HASH POSITION MIGHT BE WRONG due to Keccak Encoding
          let constructedCommitmentHash := constructCommitmentHash(transactions, transactionsLength)

          // Assert or Invalid Data Provided
          assertOrInvalidProof(eq(
              commitmentHash,
              constructedCommitmentHash
          ), ErrorCode_TransactionRootHashInvalid)

          // Select Merkle Tree Root Provided
          let merkleTreeRoot := selectMerkleTreeRoot(transactionRoot)

          // Assert committed root must be the same as computed root! // THIS HASH MIGHT BE WRONG (hash POS check)
          assertOrFraud(eq(
              merkleTreeRoot,
              constructMerkleTreeRoot(transactions, transactionsLength)
          ), FraudCode_InvalidMerkleTreeRoot)
      }

      // Verify Transaction Proof
      function verifyTransactionProof(proofIndex, includeUTXOProofs, assertFinalized) {
          /*
          Transaction Proof:
              - Lengths
              - BlockHeader
              - TransactionRootHeader
              - TransactionMerkleProof
              - TransactionData
              - TransactionUTXOProofs
          */

          // we are on proof 1
          if gt(proofIndex, 0) {
              // Notate across global stack we are on proof 1 validation
              mpush(Stack_ProofNumber, proofIndex)
          }

          // Select Memory Positions
          let blockHeader := selectBlockHeader(proofIndex)
          let transactionRoot := selectTransactionRoot(proofIndex)
          let transactionMerkleProof := selectTransactionMerkleProof(proofIndex)
          let transactionData := selectTransactionData(proofIndex)

          // Verify Block Header
          verifyBlockHeader(blockHeader, assertFinalized)

          // Verify Transaction Root Header
          verifyTransactionRootHeader(blockHeader, transactionRoot)

          // Verify Transaction Leaf
          verifyTransactionLeaf(transactionRoot, transactionData, transactionMerkleProof)

          // Construct Transaction Leaf Hash (Again :(
          let transactionLeafHash := constructTransactionLeafHash(transactionData)

          // If transaction hash is not zero hash, than go and verify it!
          if gt(transactionLeafHash, 0) {
              // Transaction UTXO Proofs
              let transactionUTXOProofs := 0

              // Include UTXO Proofs
              if gt(includeUTXOProofs, 0) {
                  transactionUTXOProofs := selectTransactionUTXOProofs(proofIndex)
              }

              // Verify Transaction Data
              verifyTransactionData(transactionData, transactionUTXOProofs)
          }

          // Ensure We are now validating proof 0 again
          mpop(Stack_ProofNumber)
      }

      // Verify Transaction Leaf (Assume Transaction Root Header is Valid)
      function verifyTransactionLeaf(transactionRoot, transactionData, merkleProof) {
        /*
        - Transaction Root Header:
          - transactionRootProducer [32 bytes] -- padded address
          - transactionRootMerkleTreeRoot [32 bytes]
          - transactionRootCommitmentHash [32 bytes]
          - transactionRootIndex [32 bytes]

        - Transaction Data:
          - input index [32 bytes] -- padded uint8
          - output index [32 bytes] -- padded uint8
          - witness index [32 bytes] -- padded uint8
          - transactionInputsLength [32 bytes] -- padded uint8
          - transactionIndex [32 bytes] -- padded uint32
          - transactionLeafData [dynamic bytes]

        - Transaction Merkle Proof:
          - oppositeTransactionLeaf [32 bytes]
          - merkleProof [64 + dynamic bytes]
        */

        // Select Merkle Tree Root
        let merkleTreeRoot := selectMerkleTreeRoot(transactionRoot)

        // Select Merkle Proof Height
        let treeHeight := selectMerkleTreeHeight(merkleProof)

        // Select Tree (ahead of Array length)
        let treeMemoryPosition := selectMerkleTree(merkleProof)

        // Select Transaction Index
        let transactionIndex := selectTransactionIndex(transactionData)

        // Assert Valid Merkle Tree Height (i.e. below Maximum)
        assertOrInvalidProof(lt(treeHeight, MerkleTreeHeightMaximum),
          ErrorCode_MerkleTreeHeightOverflow)

        // Select computed hash, initialize with opposite leaf hash
        let computedHash := selectOppositeTransactionLeaf(merkleProof)

        // Assert Leaf Hash is base of Merkle Proof
        assertOrInvalidProof(eq(
          constructTransactionLeafHash(transactionData), // constructed
          computedHash // proof provided
        ), ErrorCode_TransactionLeafHashInvalid)

        // Clean Rightmost (leftishness) Detection Var (i.e. any previous use of this Stack Position)
        mpop(Stack_MerkleProofLeftish)

        // Iterate Through Merkle Proof Depths
        // https://crypto.stackexchange.com/questions/31871/what-is-the-canonical-way-of-creating-merkle-tree-branches
        for { let depth := 0 } lt(depth, treeHeight) { depth := safeAdd(depth, 1) } {
            // get the leaf hash
            let proofLeafHash := load32(treeMemoryPosition, depth)

            // Determine Proof Direction the merkle brand left:  tx index % 2 == 0
            switch eq(smod(transactionIndex, 2), 0)

            // Direction is left branch
            case 1 {
                mstore(mul32(1), computedHash)
                mstore(mul32(2), proofLeafHash)

                // Leftishness Detected in Proof, This is not Rightmost
                mpush(Stack_MerkleProofLeftish, True)
            }

            // Direction is right branch
            case 0 {
                mstore(mul32(1), proofLeafHash)
                mstore(mul32(2), computedHash)
            }

            default { revert(0, 0) } // Direction is Invalid, Ensure no other cases!

            // Construct Depth Hash
            computedHash := keccak256(mul32(1), mul32(2))

            // Shift transaction index right by 1
            transactionIndex := shr(1, transactionIndex)
        }

        // Assert constructed merkle tree root is provided merkle tree root, or else, Invalid Inclusion!
        assertOrInvalidProof(eq(computedHash, merkleTreeRoot), ErrorCode_MerkleTreeRootInvalid)
      }

      // Verify Transaction Input Metadata
      function verifyTransactionInputMetadata(blockHeader, rootHeader, metadata, blockTip, inputIndex) {
          // Block Height
          let metadataBlockHeight, metadataTransactionRootIndex,
            metadataTransactionIndex, metadataOutputIndex := selectMetadata(metadata)

          // Select Transaction Block Height
          let blockHeight := selectBlockHeight(blockHeader)
          let transactionRootIndex := selectTransactionRootIndex(rootHeader)

          // Assert input index overflow (i.e. metadata does not exist)
          assertOrFraud(lt(inputIndex, mstack(Stack_MetadataLength)),
            FraudCode_MetadataReferenceOverflow)

          // Assert Valid Metadata Block height
          assertOrFraud(gt(metadataBlockHeight, 0), FraudCode_MetadataBlockHeightUnderflow)

          // Assert Valid Metadata Block height
          assertOrFraud(lt(metadataTransactionRootIndex, TRANSACTION_ROOTS_MAX),
            FraudCode_InvalidTransactionRootIndexOverflow)

          // Cannot spend past it's own root index (i.e. tx 1 cant spend tx 2 at root index + 1)

          // Can't be past block tip or past it's own block (can't reference the future)
          assertOrFraud(lte(metadataBlockHeight, blockTip),
            FraudCode_MetadataBlockHeightOverflow)

          // Check overflow of current block height
          assertOrFraud(lte(metadataBlockHeight, blockHeight),
            FraudCode_MetadataBlockHeightOverflow)

          // Can't reference in the future!!
          // If Meta is Ref. Block Height of Itself, and Ref. Root Index > Itself, that's Fraud!
          assertOrFraud(or(iszero(eq(metadataBlockHeight, blockHeight)), // block height is different
            lte(metadataTransactionRootIndex, transactionRootIndex)), // metadata root index <= self root index
            FraudCode_InvalidTransactionRootIndexOverflow)

          // Need to cover referencing a transaction index in the same block, but past this tx
          // txs must always reference txs behind it, or else it's fraud

          // Check Output Index
          assertOrFraud(lt(metadataOutputIndex, TransactionLengthMax),
            FraudCode_MetadataOutputIndexOverflow)
      }

      // Verify HTLC Usage
      function verifyHTLCData(blockHeader, input, utxoProof) {
          /*
          - Transaction UTXO Data:
            - transactionHashId [32 bytes]
            - outputIndex [32 bytes] -- padded uint8
            - type [32 bytes] -- padded uint8
            - amount [32 bytes]
            - owner [32 bytes] -- padded address or unit8
            - tokenID [32 bytes] -- padded uint32
            - [HTLC Data]:
              - digest [32 bytes]
              - expiry [32 bytes] -- padded 4 bytes
              - return witness index [32 bytes] -- padded 1 bytes
          */

          // Select Transaction Input data
          let length, utxoID, witnessReference, preImage := selectAndVerifyInputHTLC(input,
              TransactionLengthMax)

          // Select Transaction Block Height
          let blockHeight := selectBlockHeight(blockHeader)

          // Select Digest and Expiry from UTXO Proof (Assumed to be Valid)
          let digest := load32(utxoProof, 6)
          let expiry := load32(utxoProof, 7)

          // If not expired, and digest correct, expired case gets handled in Comparison proofs
          if lt(blockHeight, expiry) {
            // Assert Digest is Valid
            assertOrFraud(eq(digest, constructHTLCDigest(preImage)),
              FraudCode_InvalidHTLCDigest)
          }
      }

      // Verify Transaction Length (minimum and maximum)
      function verifyTransactionLength(transactionLength) {
        // Assert transaction length is not too short
        assertOrFraud(gt(transactionLength, TransactionSizeMinimum),
          FraudCode_TransactionLengthUnderflow)

        // Assert transaction length is not too long
        assertOrFraud(lte(transactionLength, TransactionSizeMaximum),
          FraudCode_TransactionLengthOverflow)
      }

      // Verify Transaction Data (Metadata, Inputs, Outputs, Witnesses)
      function verifyTransactionData(transactionData, utxoProofs) {
        // Verify Transaction Length
        verifyTransactionLength(selectTransactionLength(transactionData))

        // Select and Verify Lengths and Use Them as Indexes (let Index = Length; lt; Index--)
        let memoryPosition, inputsLength,
          outputsLength, witnessesLength := selectAndVerifyTransactionDetails(transactionData)

        // Memory Stack so we don't blow the stack!
        mpush(Stack_InputsSum, 0) // Total Transaction Input Sum
        mpush(Stack_OutputsSum, 0) // Total Transaction Output Sum
        mpush(Stack_Metadata, selectTransactionMetadata(transactionData)) // Metadata Memory Position
        mpush(Stack_Witnesses, selectTransactionWitnesses(transactionData)) // Witnesses Memory Position
        mpush(Stack_BlockTip, getBlockTip()) // GET blockTip() from Storage
        mpush(Stack_UTXOProofs, safeAdd(utxoProofs, mul32(1))) // UTXO Proofs Memory Position
        mpush(Stack_TransactionHashID, constructTransactionHashID(transactionData)) // Construct Transaction Hash ID
        mpush(Stack_MetadataLength, selectTransactionMetadataLength(transactionData))

        // Push summing tokens
        if gt(utxoProofs, 0) {
          mpush(Stack_SummingToken, mload(utxoProofs)) // load summing token
          mpush(Stack_SummingTokenID, getTokens(mload(utxoProofs))) // load summing token
        }

        // Set Block Header Position (on First Proof)
        if iszero(mstack(Stack_ProofNumber)) {
          // Proof 0 Block Header Position
          mpush(Stack_BlockHeader, selectBlockHeader(FirstProof))

          // Proof 0 Block Header Position
          mpush(Stack_RootHeader, selectTransactionRoot(FirstProof))

          // Return Stack Offset: (No Offset) First Transaction
          mpush(Stack_SelectionOffset, 0)

          // Proof 0 Transaction Root Producer
          mpush(Stack_RootProducer, selectRootProducer(selectTransactionRoot(FirstProof)))
        }

        // If Second Transaction Processed, Set Block Header Position (On Second Proof)
        if gt(mstack(Stack_ProofNumber), 0) {
          // Proof 1 Block Header Position
          mpush(Stack_BlockHeader, selectBlockHeader(SecondProof))

          // Proof 0 Block Header Position
          mpush(Stack_RootHeader, selectTransactionRoot(SecondProof))

          // Return Stack Offset: Offset Memory Stack for Second Proof
          mpush(Stack_SelectionOffset, SelectionStackOffsetSize) // 4 => Metadata, Input, Output, Witness Position

          // Proof 1 Transaction Root Position
          mpush(Stack_RootProducer, selectRootProducer(selectTransactionRoot(SecondProof)))
        }

        // Increase memory position past length Specifiers
        memoryPosition := safeAdd(memoryPosition, TransactionLengthSize)

        // Transaction Proof Stack Return
        // 8) Metadata Tx 1, 9) Input Tx 1, 10) Output, 11) Witness Memory Position
        // 12) Metadata Tx 2, 13) Input Tx 2, 14) Output, 15) Witness Memory Position

        // VALIDATE Inputs Index from Inputs Length -> 0
        for { mpush(Stack_Index, 0) }
          lt(mstack(Stack_Index), inputsLength)
          { mpush(Stack_Index, safeAdd(mstack(Stack_Index), 1)) } {

            // Check if This is Input Requested
            if eq(mstack(Stack_Index), selectInputSelectionIndex(transactionData)) {
                // Store Metadata Position in Stack
                mpush(safeAdd(Stack_MetadataSelected, mstack(Stack_SelectionOffset)),
                  combineUint32(mstack(Stack_Metadata), memoryPosition, mstack(Stack_Index), 0))
            }

            // Select Input Type
            switch selectInputType(memoryPosition)

            case 0 { // InputType UTXO
              // Increase Memory pointer
              let length, utxoID, witnessReference := selectAndVerifyInputUTXO(memoryPosition,
                  witnessesLength)

              // If UTXO/Deposit Proofs provided
              if gt(utxoProofs, 0) {
                  let outputAmount, outputOwner,
                    tokenID := selectAndVerifyUTXOAmountOwner(mstack(Stack_UTXOProofs), 0, utxoID)

                  // Increase input sum
                  if eq(tokenID, mstack(Stack_SummingTokenID)) {
                    mpush(Stack_InputsSum, safeAdd(mstack(Stack_InputsSum), outputAmount))
                  }

                  // Increase UTXO proof memory position
                  mpush(Stack_UTXOProofs, safeAdd(mstack(Stack_UTXOProofs), UTXOProofSize))

                  // Verify transaction witness
                  verifyTransactionWitness(selectWitnessSignature(mstack(Stack_Witnesses), witnessReference),
                      mstack(Stack_TransactionHashID), outputOwner, mstack(Stack_RootProducer))
              }

              // cannot select metadata that does not exist
              // assertOrFraud(lt(inputIndex, mstack(Stack_MetadataLength)),
              //   FraudCode_TransactionInputMetadataOverflow)

              // Verify metadata for this input (metadata position, block tip)
              verifyTransactionInputMetadata(mstack(Stack_BlockHeader), mstack(Stack_RootHeader),
                mstack(Stack_Metadata), mstack(Stack_BlockTip), mstack(Stack_Index))

              // Increase metadata memory position
              mpush(Stack_Metadata, safeAdd(mstack(Stack_Metadata), MetadataSize))

              // Push Input Length
              mpush(safeAdd(Stack_SelectedInputLength, mstack(Stack_SelectionOffset)), length)

              // increase Memory Position
              memoryPosition := safeAdd(memoryPosition, length)
            }

            case 1 { // InputType DEPOSIT (verify deposit owner / details witnesses etc)
              // Select Input Deposit (Asserts Deposit > 0)
              let length, depositHashID,
                witnessReference := selectAndVerifyInputDeposit(memoryPosition, witnessesLength)

              // If UTXO Proofs provided
              if gt(utxoProofs, 0) {
                  // Owner
                  let depositOwner := selectInputDepositOwner(mstack(Stack_UTXOProofs))

                  // Constructed Deposit hash
                  let constructedDepositHashID := constructDepositHashID(mstack(Stack_UTXOProofs))

                  // Check Deposit Hash ID against proof
                  assertOrInvalidProof(eq(depositHashID, constructedDepositHashID),
                    ErrorCode_InvalidDepositProof)

                  // Verify transaction witness
                  verifyTransactionWitness(selectWitnessSignature(mstack(Stack_Witnesses), witnessReference),
                      mstack(Stack_TransactionHashID), depositOwner, mstack(Stack_RootProducer))

                  // Deposit Token
                  let depositToken := selectInputDepositToken(mstack(Stack_UTXOProofs))

                  // Increase Input Amount
                  if eq(depositToken, mstack(Stack_SummingToken)) {
                    mpush(Stack_InputsSum, safeAdd(mstack(Stack_InputsSum), getDeposits(depositHashID)))
                  }

                  // Increase UTXO/Deposit proof memory position
                  mpush(Stack_UTXOProofs, safeAdd(mstack(Stack_UTXOProofs), DepositProofSize))
              }

              // Push Input Length
              mpush(safeAdd(Stack_SelectedInputLength, mstack(Stack_SelectionOffset)), length)

              // Increase Memory Position
              memoryPosition := safeAdd(memoryPosition, length)
            }

            case 2 { // InputType HTLC
              // Select HTLC Input
              let length, utxoID, witnessReference, preImage := selectAndVerifyInputHTLC(
                  memoryPosition, witnessesLength)

              // If UTXO Proofs provided
              if gt(utxoProofs, 0) {
                  let outputAmount, outputOwner, tokenID := selectAndVerifyUTXOAmountOwner(
                      mstack(Stack_UTXOProofs), 2, utxoID)

                  // Verify HTLC Data
                  verifyHTLCData(mstack(Stack_BlockHeader), memoryPosition, mstack(Stack_UTXOProofs))

                  // Verify transaction witness
                  verifyTransactionWitness(selectWitnessSignature(mstack(Stack_Witnesses), witnessReference),
                      mstack(Stack_TransactionHashID), outputOwner, mstack(Stack_RootProducer))

                  // Increase input sum
                  if eq(tokenID, mstack(Stack_SummingTokenID)) {
                    mpush(Stack_InputsSum, safeAdd(mstack(Stack_InputsSum), outputAmount))
                  }

                  // Increase UTXO proof memory position
                  mpush(Stack_UTXOProofs, safeAdd(mstack(Stack_UTXOProofs), UTXOProofSize))
              }

              // Verify metadata for this input (metadata position, block tip)
              verifyTransactionInputMetadata(mstack(Stack_BlockHeader), mstack(Stack_RootHeader),
                mstack(Stack_Metadata), mstack(Stack_BlockTip), mstack(Stack_Index))

              // Increase metadata memory position
              mpush(Stack_Metadata, safeAdd(mstack(Stack_Metadata), MetadataSize))

              // Push Input Length
              mpush(safeAdd(Stack_SelectedInputLength, mstack(Stack_SelectionOffset)), length)

              // Increase Memory Position
              memoryPosition := safeAdd(memoryPosition, length)
            }

            case 3 { // InputType CHANGE UNSPENT
              // HTLC input
              let length, utxoID, witnessReference := selectAndVerifyInputUTXO(memoryPosition, witnessesLength)

              // If UTXO Proofs provided
              if gt(utxoProofs, 0) {
                  let outputAmount, outputOwner,
                    tokenID := selectAndVerifyUTXOAmountOwner(mstack(Stack_UTXOProofs),
                      OutputType_Change, utxoID)

                  // witness signatures get enforced in invalidTransactionInput

                  // Increase input sum
                  if eq(tokenID, mstack(Stack_SummingTokenID)) {
                    mpush(Stack_InputsSum, safeAdd(mstack(Stack_InputsSum), outputAmount))
                  }

                  // Increase UTXO proof memory position
                  mpush(Stack_UTXOProofs, safeAdd(mstack(Stack_UTXOProofs), UTXOProofSize))
              }

              // Verify metadata for this input (metadata position, block tip)
              verifyTransactionInputMetadata(mstack(Stack_BlockHeader), mstack(Stack_RootHeader),
                mstack(Stack_Metadata), mstack(Stack_BlockTip), mstack(Stack_Index))

              // Increase metadata memory position
              mpush(Stack_Metadata, safeAdd(mstack(Stack_Metadata), MetadataSize))

              // Push Input Length
              mpush(safeAdd(Stack_SelectedInputLength, mstack(Stack_SelectionOffset)), length)

              // Increase Memory Position
              memoryPosition := safeAdd(memoryPosition, length)
            }

            // Assert fraud Invalid Input Type
            default { assertOrFraud(0, FraudCode_InvalidTransactionInputType) }

            // Increase Memory Pointer for 1 byte Type
            memoryPosition := safeAdd(memoryPosition, TypeSize)
        }

        // Index from Outputs Length -> 0
        for { mpush(Stack_Index, 0) }
          lt(mstack(Stack_Index), outputsLength)
          { mpush(Stack_Index, safeAdd(mstack(Stack_Index), 1)) } {

            // Check if input is requested
            if eq(mstack(Stack_Index), selectOutputSelectionIndex(transactionData)) {
                // Store Output Memory Position in Stack
                mpush(safeAdd(Stack_OutputSelected, mstack(Stack_SelectionOffset)), memoryPosition)
            }

            // Select Output Type
            switch selectOutputType(memoryPosition)

            case 0 { // OutputType UTXO
              // Increase Memory pointer
              let length, amount, owner, tokenID := selectAndVerifyOutput(memoryPosition, False)

              // Increase total output sum
              if eq(tokenID, mstack(Stack_SummingTokenID)) {
                mpush(Stack_OutputsSum, safeAdd(mstack(Stack_OutputsSum), amount))
              }

              // Increase Memory pointer
              memoryPosition := safeAdd(length, memoryPosition)
            }

            case 1 { // OutputType withdrawal
              // Increase Memory pointer
              let length, amount, owner, tokenID := selectAndVerifyOutput(memoryPosition, False)

              // Increase total output sum
              if eq(tokenID, mstack(Stack_SummingTokenID)) {
                mpush(Stack_OutputsSum, safeAdd(mstack(Stack_OutputsSum), amount))
              }

              // Increase Memory pointer
              memoryPosition := safeAdd(length, memoryPosition)
            }

            case 2 { // OutputType HTLC
              // Increase Memory pointer
              let length, amount, owner, tokenID,
                digest, expiry, returnWitness := selectAndVerifyOutputHTLC(memoryPosition,
                    witnessesLength)

              // Check expiry is greater than its own block header
              assertOrFraud(gt(expiry, selectBlockHeight(mstack(Stack_BlockHeader))),
                FraudCode_OutputHTLCExpiryUnderflow)

              // Increase total output sum
              if eq(tokenID, mstack(Stack_SummingTokenID)) {
                mpush(Stack_OutputsSum, safeAdd(mstack(Stack_OutputsSum), amount))
              }

              // Increase Memory pointer
              memoryPosition := safeAdd(length, memoryPosition)
            }

            case 3 { // OutputType CHANGE UNSPENT
              // Increase Memory pointer
              let length, amount, witnessReference,
                tokenID := selectAndVerifyOutput(memoryPosition, True)

              // Invalid Witness Reference out of bounds
              assertOrFraud(lt(witnessReference, witnessesLength),
                FraudCode_TransactionOutputWitnessReferenceOverflow)

              // Increase total output sum
              if eq(tokenID, mstack(Stack_SummingTokenID)) {
                mpush(Stack_OutputsSum, safeAdd(mstack(Stack_OutputsSum), amount))
              }

              // Increase Memory pointer
              memoryPosition := safeAdd(length, memoryPosition)
            }

            // Assert fraud Invalid Input Type
            default { assertOrFraud(0, FraudCode_InvalidTransactionOutputType) }

            // Increase Memory Pointer for 1 byte Type
            memoryPosition := safeAdd(memoryPosition, TypeSize)
        }

        // Assert Transaction Total Output Sum <= Total Input Sum
        if gt(utxoProofs, 0) { assertOrFraud(eq(mstack(Stack_OutputsSum), mstack(Stack_InputsSum)),
          FraudCode_TransactionSumMismatch) }

        // Iterate from Witnesses Length -> 0
        for { mpush(Stack_Index, 0) }
          lt(mstack(Stack_Index), witnessesLength)
          { mpush(Stack_Index, safeAdd(mstack(Stack_Index), 1)) } {

            // check if input is requested
            if eq(mstack(Stack_Index), selectWitnessSelectionIndex(transactionData)) {
                // Store Witness Memory Position in Stack
                mpush(safeAdd(Stack_WitnessSelected, mstack(Stack_SelectionOffset)),
                  mstack(Stack_Witnesses))
            }

            // Increase witness memory position
            mpush(Stack_Witnesses, safeAdd(mstack(Stack_Witnesses), WitnessSize))
        }

        // Check Transaction Length for Validity based on Computed Lengths

        // Get Leaf Size details
        let unsignedTransactionData, metadataSize,
          witnessesSize, witnessLength := selectAndVerifyTransactionLeafData(transactionData)

        // Select Transaction Length
        let transactionLength := selectTransactionLength(transactionData)

        // Metadata size
        let providedDataSize := add3(TransactionLengthSize, metadataSize, witnessesSize)

        // We should never hit this, but we will add in the protection anyway..
        assertOrFraud(lt(providedDataSize, transactionLength),
          FraudCode_ProvidedDataOverflow)

        // Memory size difference
        let unsignedTransactionLength := safeSub(transactionLength, providedDataSize)

        // We should never hit this, but we will add in the protection anyway..
        assertOrFraud(lt(unsignedTransactionData, memoryPosition),
          FraudCode_ProvidedDataOverflow)

        // Computed unsigned transaction length
        // Should never underflow
        let computedUnsignedTransactionLength := safeSub(memoryPosition, unsignedTransactionData)

        // Invalid transaction length
        assertOrFraud(eq(unsignedTransactionLength, computedUnsignedTransactionLength),
          FraudCode_ComputedTransactionLengthOverflow)

        // Pop Memory Stack
        mpop(Stack_InputsSum)
        mpop(Stack_OutputsSum)
        mpop(Stack_Metadata)
        mpop(Stack_Witnesses)
        mpop(Stack_BlockTip)
        mpop(Stack_UTXOProofs)
        mpop(Stack_TransactionHashID)
        mpop(Stack_MetadataLength)
        mpush(Stack_SummingToken, 0) // load summing token
        mpush(Stack_SummingTokenID, 0) // load summing token
        mpop(Stack_Index)
        // We leave Memory Stack 6 for Secondary Transaction Proof Validation
        // We don't clear 7 - 15 (those are the returns from transaction processing)

        // Warning: CHECK Transaction Leaf Length here for Computed Length!!
      }

      mpop(Stack_Index)

      //
      // SELECTOR METHODS
      // For selecting, parsing and enforcing side-chain abstractions, rules and data across runtime memory
      //

      // Select the UTXO ID for an Input
      function selectUTXOID(input) -> utxoID {
          // Past 1 (input type)
          utxoID := mload(safeAdd(input, TypeSize))
      }

      // Select Metadata
      function selectMetadata(metadata) -> blockHeight, transactionRootIndex,
        transactionIndex, outputIndex {
          blockHeight := slice(metadata, 4)
          transactionRootIndex := slice(safeAdd(metadata, 4), IndexSize)
          transactionIndex := slice(safeAdd(metadata, 5), 2)
          outputIndex := slice(safeAdd(metadata, 7), IndexSize)
      }

      // Select Metadata Selected (Used after verifyTransactionData)
      function selectInputSelectedHash(proofIndex) -> inputHash {
          let offset := 0

          // Second proof, move offset to 4
          if gt(proofIndex, 0) { offset := SelectionStackOffsetSize }

          // Input Hash Length (Type 1 Byte + Input Length Provided)
          let inputHashLength := 0

          // Input Memory Position
          let input := selectInputSelected(proofIndex)

          // Get lenght
          switch selectInputType(input)

          case 0 {
            inputHashLength := 33
          }
          case 1 {
            inputHashLength := 33
          }
          case 2 {
            inputHashLength := 65
          }
          case 3 {
            inputHashLength := 33
          }
          default { assertOrInvalidProof(0, 0) }

          // Set metadata
          inputHash := keccak256(input, inputHashLength)
      }

      // Select Metadata Selected (Used after verifyTransactionData)
      function selectMetadataSelected(proofIndex) -> metadata {
          let offset := 0

          // Second proof, move offset to 4
          if gt(proofIndex, 0) { offset := SelectionStackOffsetSize }

          // Return metadata memory position
          let metadataInput, input, unused,
            unused2 := splitCombinedUint32(mstack(safeAdd(Stack_MetadataSelected, offset)))

          // Set metadata
          metadata := metadataInput
      }

      // Select Input Selected (Used after verifyTransactionData)
      function selectInputSelected(proofIndex) -> input {
          let offset := 0

          // Second proof, move offset to 4
          if gt(proofIndex, 0) { offset := SelectionStackOffsetSize }

          // Get values
          let metadata, inputPosition, unused,
            unused2 := splitCombinedUint32(mstack(safeAdd(Stack_MetadataSelected, offset)))

          // Input position
          input := inputPosition
      }

      // Select Output Selected (Used after verifyTransactionData)
      function selectOutputSelected(proofIndex) -> output {
          let offset := 0

          // Second proof, move offset to 4
          if gt(proofIndex, 0) { offset := SelectionStackOffsetSize }

          // Return metadata memory position
          output := mstack(safeAdd(Stack_OutputSelected, offset))
      }

      // Select Witness Selected (Used after verifyTransactionData)
      function selectWitnessSelected(proofIndex) -> witness {
          let offset := 0

          // Second proof, move offset to 4
          if gt(proofIndex, 0) { offset := SelectionStackOffsetSize }

          // Return metadata memory position
          witness := mstack(safeAdd(Stack_WitnessSelected, offset))
      }

      function selectBlockHeaderLength(transactionProof) -> blockHeaderLength {
        blockHeaderLength := load32(transactionProof, 0)
      }

      function selectTransactionRootLength(transactionProof) -> transactionRootLength {
        transactionRootLength := load32(transactionProof, 1)
      }

      function selectMerkleProofLength(transactionProof) -> merkleProofLength {
        merkleProofLength := load32(transactionProof, 2)
      }

      // Select Transaction Proof Lengths
      function selectTransactionProofLengths(transactionProof) ->
          lengthsLength,
          blockHeaderLength,
          transactionRootHeaderLength,
          transactionDataLength,
          transactionMerkleLength,
          transactionUTXOLength {

          // Compute Proof Length or Lengths
          lengthsLength := mul32(5)

          // If malformed block proof
          if iszero(selectProofType()) {
              lengthsLength := mul32(3)
          }

          // Select Proof Lengths
          blockHeaderLength := load32(transactionProof, 0)
          transactionRootHeaderLength := load32(transactionProof, 1)
          transactionMerkleLength := load32(transactionProof, 2)
          transactionDataLength := load32(transactionProof, 3)
          transactionUTXOLength := load32(transactionProof, 4)
      }

      // Select Transaction Proof Memory Position
      function selectTransactionProof(proofIndex) -> transactionProof {
          // Increase proof memory position for proof type (32 bytes)
          transactionProof := safeAdd(Calldata_MemoryPosition, mul32(1))

          // Select second proof instead!
          if gt(proofIndex, 0) {
              // Get lengths
              let lengthsLength,
                  blockHeaderLength,
                  transactionRootHeaderLength,
                  transactionDataLength,
                  transactionMerkleLength,
                  transactionUTXOLength := selectTransactionProofLengths(transactionProof)

              // Secondary position
              transactionProof := add4(
                  transactionProof, lengthsLength, blockHeaderLength,
                  add4(transactionRootHeaderLength, transactionMerkleLength,
                      transactionDataLength, transactionUTXOLength))
          }
      }

      // Select Transaction Proof Block Header
      function selectBlockHeader(proofIndex) -> blockHeader {
          // Select Proof Memory Position
          blockHeader := selectTransactionProof(proofIndex)

          // If it's not the bond withdrawal
          if lt(selectProofType(), 6) {
            let lengthsLength,
                blockHeaderLength,
                transactionRootHeaderLength,
                transactionDataLength,
                transactionMerkleLength,
                transactionUTXOLength := selectTransactionProofLengths(blockHeader)

            // Block header (always after lengths)
            blockHeader := safeAdd(blockHeader, lengthsLength)
          }
      }

      function selectBlockProducer(blockHeader) -> blockProducer {
          blockProducer := load32(blockHeader, 0)
      }

      function selectBlockHeight(blockHeader) -> blockHeight {
          blockHeight := load32(blockHeader, 2)
      }

      function selectPreviousBlockHash(blockHeader) -> previousBlockHash {
          previousBlockHash := load32(blockHeader, 1)
      }

      function selectTransactionRootsLength(blockHeader) -> transactionRootsLength {
          transactionRootsLength := load32(blockHeader, 5)
      }

      function selectEthereumBlockNumber(blockHeader) -> ethereumBlockNumber {
          ethereumBlockNumber := load32(blockHeader, 3)
      }

      // Select Transaction Root from Proof
      function selectTransactionRoot(proofIndex) -> transactionRoot {
          // Select Proof Memory Position
          let transactionProof := selectTransactionProof(proofIndex)

          // Get lengths
          let lengthsLength,
              blockHeaderLength,
              transactionRootHeaderLength,
              transactionDataLength,
              transactionMerkleLength,
              transactionUTXOLength := selectTransactionProofLengths(transactionProof)

          // Select Transaction Root Position
          transactionRoot := add3(transactionProof, lengthsLength, blockHeaderLength)
      }

      // Select Root Producer
      function selectRootProducer(transactionRoot) -> rootProducer {
          rootProducer := load32(transactionRoot, 0)
      }

      // Select Merkle Tree Root
      function selectMerkleTreeRoot(transactionRoot) -> merkleTreeRoot {
          merkleTreeRoot := load32(transactionRoot, 1)
      }

      // Select commitment hash from root
      function selectCommitmentHash(transactionRoot) -> commitmentHash {
         commitmentHash := load32(transactionRoot, 2)
      }

      // Select Transaction Root Index
      function selectTransactionRootIndex(transactionRoot) -> transactionRootIndex {
          transactionRootIndex := load32(transactionRoot, 3)
      }

      // Select Transaction Root from Proof
      function selectTransactionMerkleProof(proofIndex) -> merkleProof {
          // Select Proof Memory Position
          merkleProof := selectTransactionProof(proofIndex)

          // Get lengths
          let lengthsLength,
              blockHeaderLength,
              transactionRootHeaderLength,
              transactionDataLength,
              transactionMerkleLength,
              transactionUTXOLength := selectTransactionProofLengths(merkleProof)

          // Select Transaction Root Position
          merkleProof := add4(merkleProof, lengthsLength,
              blockHeaderLength, transactionRootHeaderLength)
      }

      // Select First Merkle Proof
      function selectMerkleTreeBaseLeaf(merkleProof) -> leaf {
        leaf := load32(merkleProof, 3)
      }

      // Select Opposite Transaction Leaf in Merkle Proof
      function selectOppositeTransactionLeaf(merkleProof) -> oppositeTransactionLeaf {
          oppositeTransactionLeaf := mload(merkleProof)
      }

      // Select Merkle Tree Height
      function selectMerkleTreeHeight(merkleProof) -> merkleTreeHeight {
          merkleTreeHeight := load32(merkleProof, 2)
      }

      // Select Merkle Tree Height
      function selectMerkleTree(merkleProof) -> merkleTree {
          merkleTree := safeAdd(merkleProof, mul32(3))
      }

      // Select Transaction Data from Proof
      function selectTransactionData(proofIndex) -> transactionData {
          // Select Proof Memory Position
          let proofMemoryPosition := selectTransactionProof(proofIndex)

          // Get lengths
          let lengthsLength,
              blockHeaderLength,
              transactionRootHeaderLength,
              transactionDataLength,
              transactionMerkleLength,
              transactionUTXOLength := selectTransactionProofLengths(proofMemoryPosition)

          // Select Transaction Data Position
          transactionData := add4(proofMemoryPosition, lengthsLength,
            blockHeaderLength, safeAdd(transactionRootHeaderLength, transactionMerkleLength))
      }

      function selectTransactionIndex(transactionData) -> transactionIndex {
          transactionIndex := load32(transactionData, 3)
      }

      function selectInputIndex(transactionData) -> outputIndex {
          outputIndex := load32(transactionData, 0)
      }

      function selectOutputIndex(transactionData) -> outputIndex {
          outputIndex := load32(transactionData, 1)
      }

      function selectWitnessIndex(transactionData) -> outputIndex {
          outputIndex := load32(transactionData, 2)
      }

      // Verify Transaction Lengths
      function verifyTransactionProofLengths(proofCount) {
          // Total Proof Length
          let proofLengthWithoutType := 0

          // Iterate and Compute Maximum length
          for { let proofIndex := 0 }
            and(lt(proofIndex, 2), lt(proofIndex, proofCount))
            { proofIndex := safeAdd(proofIndex, 1) } {
            // Get lengths
            let lengthsLength,
                blockHeaderLength,
                transactionRootHeaderLength,
                transactionDataLength,
                transactionMerkleLength,
                transactionUTXOLength := selectTransactionProofLengths(selectTransactionProof(proofIndex))

            // Add total proof length
            proofLengthWithoutType := add4(add4(proofLengthWithoutType,
                lengthsLength,
                blockHeaderLength,
                transactionRootHeaderLength),
              transactionDataLength,
              transactionMerkleLength,
              transactionUTXOLength)
          }

          // Verify Proof Length Overflow
          verifyProofLength(proofLengthWithoutType)
      }

      // Select Transaction Data from Proof
      function selectTransactionUTXOProofs(proofIndex) -> utxoProofs {
          // Select Proof Memory Position
          let proofMemoryPosition := selectTransactionProof(proofIndex)

          // Get lengths
          let lengthsLength,
              blockHeaderLength,
              transactionRootHeaderLength,
              transactionDataLength,
              transactionMerkleLength,
              transactionUTXOLength := selectTransactionProofLengths(proofMemoryPosition)

          // Select Transaction Data Position
          utxoProofs := safeAdd(selectTransactionData(proofIndex), transactionDataLength)
      }

      function selectWithdrawalToken(proofIndex) -> withdrawalToken {
          withdrawalToken := load32(selectTransactionUTXOProofs(proofIndex), 0)
      }

      // select proof type
      function selectProofType() -> proofType {
          proofType := load32(Calldata_MemoryPosition, 0) // 32 byte chunk
      }

      // Select input
      function selectInputType(input) -> result {
          result := slice(input, 1) // [1 bytes]
      }

      // Select utxoID (length includes type)
      function selectAndVerifyInputUTXO(input, witnessesLength) -> length, utxoID, witnessReference {
          utxoID := mload(safeAdd(1, input))
          witnessReference := slice(add3(TypeSize, 32, input), IndexSize)
          length := 33 // UTXO + Witness Reference

          // Assert Witness Index is Valid
          assertOrFraud(lt(witnessReference, witnessesLength),
            FraudCode_TransactionInputWitnessReferenceOverflow)
      }

      // Select Input Deposit Proof
      function selectInputDepositOwner(depositProof) -> owner {
          // Load owner
          owner := load32(depositProof, 0)
      }

      // Select Input Deposit Proof
      function selectInputDepositToken(depositProof) -> token {
          // Load owner
          token := load32(depositProof, 1)
      }

      // Select deposit information (length includes type)
      function selectAndVerifyInputDeposit(input, witnessesLength) -> length,
        depositHashID, witnessReference {
          depositHashID := mload(safeAdd(input, TypeSize))
          witnessReference := slice(add3(input, TypeSize, 32), IndexSize)
          length := 33

          // Assert deposit is not zero
          assertOrFraud(gt(getDeposits(depositHashID), 0), FraudCode_TransactionInputDepositZero)

          // Assert Witness Index is Valid
          assertOrFraud(lt(witnessReference, witnessesLength),
            FraudCode_TransactionInputDepositWitnessOverflow)
      }

      // Select HTLC information (length includes type)
      function selectAndVerifyInputHTLC(input, witnessesLength) -> length, utxoID,
        witnessReference, preImage {
          utxoID := mload(safeAdd(input, TypeSize))
          witnessReference := slice(add3(input, TypeSize, 32), IndexSize)
          preImage := mload(add4(input, TypeSize, 32, IndexSize))
          length := 65

          // Assert valid Witness Reference (could be changed to generic witness ref overflow later..)
          assertOrFraud(lt(witnessReference, witnessesLength),
            FraudCode_TransactionHTLCWitnessOverflow)
      }

      // Select output type
      function selectOutputType(output) -> result {
          result := slice(output, TypeSize) // [1 bytes]
      }

      // Select output amounts length (length includes type)
      function selectAndVerifyOutputAmountLength(output) -> length {
        // Select amounts length past Input Type
        length := slice(safeAdd(TypeSize, output), 1)

        // Assert amounts length greater than zero
        assertOrFraud(gt(length, 0), FraudCode_TransactionOutputAmountLengthUnderflow)

        // Assert amounts length less than 33 (i.e 1 <> 32)
        assertOrFraud(lte(length, 32), FraudCode_TransactionOutputAmountLengthOverflow)
      }

      // Select output utxo (length includes type)
      function selectAndVerifyOutput(output, isChangeOutput) -> length, amount, owner, tokenID {
        let amountLength := selectAndVerifyOutputAmountLength(output)

        // Push amount
        amount := slice(add3(TypeSize, 1, output), amountLength) // 1 for Type, 1 for Amount Length

        // owner dynamic length
        let ownerLength := 20

        // is Change output, than owner is witness reference
        if eq(isChangeOutput, 1) {
          ownerLength := 1
        }

        // Push owner
        owner := slice(add4(TypeSize, 1, amountLength, output), ownerLength)

        // Select Token ID
        tokenID := slice(add4(TypeSize, 1, amountLength, safeAdd(ownerLength, output)), 4)

        // Assert Token ID is Valid
        assertOrFraud(lt(tokenID, getNumTokens()), FraudCode_TransactionOutputTokenIDOverflow)

        // Push Output Length (don't include type size)
        length := add4(TypeSize, amountLength, ownerLength, 4)
      }

      // Select output HTLC
      function selectAndVerifyOutputHTLC(output, witnessesLength) -> length, amount, owner,
        tokenID, digest, expiry, returnWitness {
          // Select amount length
          let amountLength := selectAndVerifyOutputAmountLength(output)

          // Select Output Details
          length, amount, owner, tokenID := selectAndVerifyOutput(output, False)

          // htlc
          let htlc := add3(TypeSize, output, length)

          // Select Digest from Output
          digest := mload(htlc)

          // Assert Token ID is Valid
          assertOrFraud(gt(digest, 0), FraudCode_TransactionOutputHTLCDigestZero)

          // Select Expiry
          expiry := slice(safeAdd(htlc, DigestSize), ExpirySize)

          // Assert Expiry is Valid
          assertOrFraud(gt(expiry, 0), FraudCode_TransactionOutputHTLCExpiryZero)

          // Set expiry, digest, witness
          returnWitness := slice(add3(htlc, DigestSize, ExpirySize), IndexSize)

          // Assert Valid Return Witness
          assertOrFraud(lt(returnWitness, witnessesLength),
            FraudCode_TransactionOutputWitnessReferenceOverflow)

          // Determine output length (don't include type size)
          length := add4(length, DigestSize, ExpirySize, IndexSize)
      }

      // Select the Transaction Leaf from Data
      function selectTransactionLeaf(transactionData) -> leaf {
          /*
          - Transaction Data:
            - inputSelector [32 bytes]
            - outputSelector [32 bytes]
            - witnessSelector [32 bytes]
            - transactionIndex [32 bytes]
            - transactionLeafData [dynamic bytes]
          */

          // Increase memory past the 3 selectors and 1 Index
          leaf := safeAdd(transactionData, mul32(6))
      }

      // Select transaction length
      function selectTransactionLength(transactionData) -> transactionLength {
        // Select transaction length
        transactionLength := slice(selectTransactionLeaf(transactionData), 2)
      }

      // Select Metadata Length
      function selectTransactionMetadataLength(transactionData) -> metadataLength {
          // Select metadata length 1 bytes
          metadataLength := slice(safeAdd(selectTransactionLeaf(transactionData), 2), 1)
      }

      // Select Witnesses (past witness length)
      function selectTransactionWitnesses(transactionData) -> witnessesMemoryPosition {
          // Compute metadata size
          let metadataLength := selectTransactionMetadataLength(transactionData)

          // Compute Metadata Size
          let metadataSize := safeAdd(TypeSize, safeMul(MetadataSize, metadataLength)) // Length + metadata size

          // Leaf + Size 2 + metadata size and witness size
          witnessesMemoryPosition := add4(selectTransactionLeaf(transactionData), 2,
            metadataSize, 1)
      }

      function selectWitnessSignature(witnesses, witnessIndex) -> signature {
        // Compute witness offset
        let witnessMemoryOffset := safeMul(witnessIndex, WitnessSize)

        // Compute signature
        signature := safeAdd(witnesses, witnessMemoryOffset)
      }

      // Note, we allow the transactionRootProducer to be a witness, witnesses length must be 1, zero fill 65 for witness data..
      // Select Witnesses Signature
      function verifyTransactionWitness(signature, transactionHashID, outputOwner, rootProducer) {
          // Check if the witness is not the transaction root producer (i.e. a contract possibly)
          if iszero(eq(rootProducer, outputOwner)) {
            // Assert if witness signature is invalid!
            assertOrFraud(eq(outputOwner, ecrecoverPacked(transactionHashID, signature)),
              FraudCode_InvalidTransactionWitnessSignature)
          }
      }

      // Select Transaction Leaf Data
      function selectAndVerifyTransactionLeafData(transactionData) ->
          transactionHashData, // transaction hash data (unsigned transaction data)
          metadataSize, // total metadata chunk size (length + metadata)
          witnessesSize, // total witness size (length + witnesses)
          witnessesLength { // total witnesses length

          // Compute metadata size
          let metadataLength := selectTransactionMetadataLength(transactionData)

          // Assert metadata length correctness (metadata length can be zero)
          assertOrFraud(lte(metadataLength, TransactionLengthMax),
            FraudCode_TransactionMetadataLengthOverflow)

          // Compute Metadata Size
          metadataSize := safeAdd(1, safeMul(MetadataSize, metadataLength)) // Length + metadata size

          // Leaf + Size 2 + metadata size and witness size
          transactionHashData := add3(selectTransactionLeaf(transactionData), 2, metadataSize)

          // get witnesses length
          witnessesLength := slice(transactionHashData, 1) // Witness Length
          witnessesSize := safeAdd(1, safeMul(WitnessSize, witnessesLength)) // Length + witness size

          // Leaf + Size 2 + metadata size and witness size
          transactionHashData := safeAdd(transactionHashData, witnessesSize)
      }

      // Select Transaction Details
      function selectAndVerifyTransactionDetails(transactionData) ->
        memoryPosition, inputsLength, outputsLength, witnessesLength {

        let unsignedTransactionData, metadataSize,
          witnessesSize, witnessLength := selectAndVerifyTransactionLeafData(transactionData)

        // Setup length (push to new name)
        witnessesLength := witnessLength

        // Set Transaction Data Memory Position
        memoryPosition := unsignedTransactionData

        // Assert witness length
        assertOrFraud(gt(witnessesLength, TransactionLengthMin),
          FraudCode_TransactionWitnessesLengthUnderflow)
        assertOrFraud(lte(witnessesLength, TransactionLengthMax),
          FraudCode_TransactionWitnessesLengthOverflow)

        // Select lengths
        inputsLength := slice(memoryPosition, 1) // Inputs Length
        outputsLength := slice(safeAdd(1, memoryPosition), 1) // Outputs Length

        // Assert inputsLength and outputsLength minimum
        assertOrFraud(gt(inputsLength, TransactionLengthMin),
          FraudCode_TransactionInputsLengthUnderflow)
        assertOrFraud(gt(outputsLength, TransactionLengthMin),
          FraudCode_TransactionOutputsLengthUnderflow)

        // Assert Length overflow checks
        assertOrFraud(lte(inputsLength, TransactionLengthMax),
          FraudCode_TransactionInputsLengthOverflow)
        assertOrFraud(lte(outputsLength, TransactionLengthMax),
          FraudCode_TransactionOutputsLengthOverflow)

        // Assert metadata length correctness (metadata length can be zero)
        assertOrFraud(lte(selectTransactionMetadataLength(transactionData), inputsLength),
          FraudCode_TransactionMetadataLengthOverflow)

        // Assert selections are valid against lengths
        assertOrInvalidProof(lt(selectInputSelectionIndex(transactionData), inputsLength),
          ErrorCode_InputIndexSelectedOverflow)
        assertOrInvalidProof(lt(selectOutputSelectionIndex(transactionData), outputsLength),
          ErrorCode_OutputIndexSelectedOverflow)
        assertOrInvalidProof(lt(selectWitnessSelectionIndex(transactionData), witnessesLength),
          ErrorCode_WitnessIndexSelectedOverflow)
      }

      // Select Transaction Metadata (Past Length)
      function selectTransactionMetadata(transactionData) -> transactionMetadata {
          // Increase memory position past lengths
          transactionMetadata := safeAdd(selectTransactionLeaf(transactionData), 3)
      }

      // Select UTXO proof
      function selectAndVerifyUTXOAmountOwner(utxoProof, requestedOutputType, providedUTXOID) ->
        outputAmount, outputOwner, tokenID {
          /*
            - Transaction UTXO Proof(s): -- 288 bytes (same order as inputs, skip Deposit index with zero fill)
              - transactionHashId [32 bytes] -- bytes32
              - outputIndex [32 bytes] -- padded uint8
              - type [32 bytes] -- padded uint8
              - amount [32 bytes] -- uint256
              - owner [32 bytes] -- padded address or witness reference index uint8
              - tokenID [32 bytes] -- padded uint32
              - [HTLC Data]:
                - digest [32 bytes] -- bytes32 (or zero pad 32 bytes)
                - expiry [32 bytes] -- padded uint32 (or zero pad 32 bytes)
                - return witness index [32 bytes] -- padded uint8] (or zero pad 32 bytes)
          */

          // Assert computed utxo id correct
          assertOrInvalidProof(eq(providedUTXOID, constructUTXOID(utxoProof)),
            ErrorCode_TransactionUTXOIDInvalid)

          // Compute output amount
          let outputType := load32(utxoProof, 2)

          // Assert output type is correct
          assertOrFraud(eq(requestedOutputType, outputType),
            FraudCode_TransactionUTXOType)

          // Assert index correctness
          assertOrFraud(lt(load32(utxoProof, 1), TransactionLengthMax),
            FraudCode_TransactionUTXOOutputIndexOverflow)

          // Compute output amount
          outputAmount := load32(utxoProof, 3)

          // Compute output amount
          outputOwner := load32(utxoProof, 4)

          // Compute output amount
          tokenID := load32(utxoProof, 5)
      }

      //
      // CONSTRUCTION METHODS
      // For the construction of cryptographic side-chain hashes
      //

      // produce block hash from block header
      function constructBlockHash(blockHeader) -> blockHash {
          /*
          - Block Header:
            - blockProducer [32 bytes] -- padded address
            - previousBlockHash [32 bytes]
            - blockHeight [32 bytes]
            - ethereumBlockNumber [32 bytes]
            - transactionRoots [64 + bytes32 array]
          */

          // Select Transaction root Length
          let transactionRootsLength := load32(blockHeader, 5)

          // Construct Block Hash
          blockHash := keccak256(blockHeader, mul32(safeAdd(6, transactionRootsLength)))
      }

      // produce a transaction hash id from a proof (subtract metadata and inputs length from hash data)
      function constructTransactionHashID(transactionData) -> transactionHashID {
          /*
          - Transaction Data:
            - inputSelector [32 bytes]
            - outputSelector [32 bytes]
            - witnessSelector [32 bytes]
            - transactionIndex [32 bytes]
            - transactionLeafData [dynamic bytes]

          - Transaction Leaf Data:
              - transactionByteLength [2 bytes] (max 2048)
              - metadata length [1 bytes] (min 1 - max 8)
              - input metadata [dynamic -- 8 bytes per]:
                - blockHeight [4 bytes]
                - transactionRootIndex [1 byte]
                - transactionIndex [2 bytes]
                - output index [1 byte]
              - witnessLength [1 bytes]
              - witnesses [dynamic]:
                  - signature [65 bytes]
          */

          // Get entire tx length, and metadata sizes / positions
          let transactionLength := selectTransactionLength(transactionData) // length is first 2

          if gt(transactionLength, 0) {
            let transactionLeaf, metadataSize,
              witnessesSize, witnessLength := selectAndVerifyTransactionLeafData(transactionData)

            // setup hash keccak256(start, length)
            let transactionHashDataLength := safeSub(safeSub(transactionLength, TransactionLengthSize),
                safeAdd(metadataSize, witnessesSize))

            // create transaction ID
            transactionHashID := keccak256(transactionLeaf, transactionHashDataLength)
          }
      }

      // Construct Deposit Hash ID
      function constructDepositHashID(depositProof) -> depositHashID {
        depositHashID := keccak256(depositProof, mul32(3))
      }

      // Construct a UTXO Proof from a Transaction Output
      function constructUTXOProof(transactionHashID, outputIndex, output) -> utxoProof {
          let isChangeOutput := False

          // Output Change
          if eq(selectOutputType(output), OutputType_Change) {
            isChangeOutput := True
          }

          // Select and Verify output
          let length, amount, owner, tokenID := selectAndVerifyOutput(output, isChangeOutput)

          // Encode Pack Transaction Output Data
          mstore(mul32(1), transactionHashID)
          mstore(mul32(2), outputIndex)
          mstore(mul32(3), selectOutputType(output))
          mstore(mul32(4), amount)
          mstore(mul32(5), owner) // address or witness index
          mstore(mul32(6), tokenID)
          mstore(mul32(7), 0)
          mstore(mul32(8), 0)
          mstore(mul32(9), 0)

          // Include HTLC Data here
          if eq(selectOutputType(output), 2) {
              let unused0, unused1, unused2,
                unused3, digest, expiry, returnWitness := selectAndVerifyOutputHTLC(output,
                    TransactionLengthMax)

              mstore(mul32(7), digest)
              mstore(mul32(8), expiry)
              mstore(mul32(9), returnWitness)
          }

          // Return UTXO Memory Position
          utxoProof := mul32(1)
      }

      // Construct a UTXO ID
      function constructUTXOID(utxoProof) -> utxoID {
          /*
          - Transaction UTXO Data:
            - transactionHashId [32 bytes]
            - outputIndex [32 bytes] -- padded uint8
            - type [32 bytes] -- padded uint8
            - amount [32 bytes]
            - owner [32 bytes] -- padded address or unit8
            - tokenID [32 bytes] -- padded uint32
            - [HTLC Data]: -- padded with zeros
              - digest [32 bytes]
              - expiry [32 bytes] -- padded 4 bytes
              - return witness index [32 bytes] -- padded 1 bytes
          */

          // Construct UTXO ID
          utxoID := keccak256(utxoProof, UTXOProofSize)
      }

      // Construct the Transaction Leaf Hash
      function constructTransactionLeafHash(transactionData) -> transactionLeafHash {
          /*
          - Transaction Data:
            - inputSelector [32 bytes]
            - outputSelector [32 bytes]
            - witnessSelector [32 bytes]
            - transactionIndex [32 bytes]
            - transactionLeafData [dynamic bytes]
          */

          // Get first two transaction length bytes
          let transactionLength := selectTransactionLength(transactionData)

          // Check if length is Zero, than don't hash!
          switch eq(transactionLength, 0)

          // Return Zero leaf hash
          case 1 {
              transactionLeafHash := 0
          }

          // Hash as Normal Transaction
          default {
             // Start Hash Past Selections (3) and Index (1)
             let hashStart := selectTransactionLeaf(transactionData)

             // Return the transaction leaf hash
             transactionLeafHash := keccak256(hashStart, transactionLength)
          }
      }

      // Select input index
      function selectInputSelectionIndex(transactionData) -> inputIndex {
          inputIndex := load32(transactionData, 0)
      }

      // Select output index
      function selectOutputSelectionIndex(transactionData) -> outputIndex {
          outputIndex := load32(transactionData, 1)
      }

      // Select witness index
      function selectWitnessSelectionIndex(transactionData) -> witnessIndex {
          witnessIndex := load32(transactionData, 2)
      }


      // This function Must Select Block of Current Proof Being Validated!! NOT DONE YET!
      // Assert True or Fraud, Set Side-chain to Valid block and Stop Execution
      function assertOrFraud(assertion, fraudCode) {
          // Assert or Begin Fraud State Change Sequence
          if lt(assertion, 1) {
              // proof index
              let proofIndex := 0

              // We are validating proof 2
              if gt(mstack(Stack_ProofNumber), 0) {
                  proofIndex := 1
              }

              // Fraud block details
              let fraudBlockHeight := selectBlockHeight(selectBlockHeader(proofIndex))
              let fraudBlockProducer := selectBlockProducer(selectBlockHeader(proofIndex))
              let ethereumBlockNumber := selectEthereumBlockNumber(selectBlockHeader(proofIndex))

              // Assert Fraud block cannot be the genesis block
              assertOrInvalidProof(gt(fraudBlockHeight, GenesisBlockHeight),
                ErrorCode_FraudBlockHeightUnderflow)

              // Assert fraud block cannot be finalized
              assertOrInvalidProof(lt(number(), safeAdd(ethereumBlockNumber, FINALIZATION_DELAY)),
                ErrorCode_FraudBlockFinalized)

              // Push old block tip
              let previousBlockTip := getBlockTip()

              // Set new block tip to before fraud block
              setBlockTip(safeSub(fraudBlockHeight, 1))

              // Release Block Producer, If it's Permissioned
              // (i.e. block producer committed fraud so get them out!)
              // if eq(fraudBlockProducer, getBlockProducer()) {
                  // setBlockProducer(0)
              // }

              // Log block tips (old / new)
              log4(0, 0, FraudEventTopic, previousBlockTip, getBlockTip(),
                fraudCode)

              // Transfer Half The Bond for this Block
              transfer(div(BOND_SIZE, 2), EtherToken, EtherToken, caller())

              // stop execution from here
              stop()
          }
      }

      // Construct withdrawal Hash ID
      function constructWithdrawalHashID(transactionRootIndex,
          transactionLeafHash, outputIndex) -> withdrawalHashID {
          // Construct withdrawal Hash
          mstore(mul32(1), transactionRootIndex)
          mstore(mul32(2), transactionLeafHash)
          mstore(mul32(3), outputIndex)

          // Hash Leaf and Output Together
          withdrawalHashID := keccak256(mul32(1), mul32(3))
      }

      // Construct Transactions Merkle Tree Root
      function constructMerkleTreeRoot(transactions, transactionsLength) -> merkleTreeRoot {
          // Start Memory Position at Transactions Data
          let memoryPosition := transactions
          let nodesLength := 0
          let netLength := 0
          let freshMemoryPosition := mstack(Stack_FreshMemory)

          // create base hashes and notate node count
          for { let transactionIndex := 0 }
              lt(transactionIndex, MaxTransactionsInBlock)
              { transactionIndex := safeAdd(transactionIndex, 1) } {

              // get the transaction length
              let transactionLength := slice(memoryPosition, TransactionLengthSize)

              // If Transaction length is zero and we are past first tx, stop (we are at the end)
              if and(gt(transactionIndex, 0), iszero(transactionLength)) { break }

              // if transaction length is below minimum transaction length, stop
              verifyTransactionLength(transactionLength)

              // add net length together
              netLength := safeAdd(netLength, transactionLength)

              // computed length greater than provided payload
              assertOrFraud(lte(netLength, transactionsLength),
                FraudCode_InvalidTransactionsNetLength)

              // store the base leaf hash (add 2 removed from here..)
              mstore(freshMemoryPosition, keccak256(memoryPosition, transactionLength))

              // increase the memory length
              memoryPosition := safeAdd(memoryPosition, transactionLength)

              // increase fresh memory by 32 bytes
              freshMemoryPosition := safeAdd(freshMemoryPosition, 32)

              // increase number of nodes
              nodesLength := safeAdd(nodesLength, 1)
          }

          // computed length greater than provided payload
          assertOrFraud(eq(netLength, transactionsLength), FraudCode_InvalidTransactionsNetLength)

          // Merkleize nodes into a binary merkle tree
          memoryPosition := safeSub(freshMemoryPosition, safeMul(nodesLength, 32)) // setup new memory position

          // Create Binary Merkle Tree / Master Root Hash
          for {} gt(nodesLength, 0) {} { // loop through tree Heights (starting at base)
            if gt(mod(nodesLength, 2), 0) { // fix uneven leaf count (i.e. add a zero hash)
              mstore(safeAdd(memoryPosition, safeMul(nodesLength, 32)), 0) // add 0x00...000 hash leaf
              nodesLength := safeAdd(nodesLength, 1) // increase count for zero hash leaf
              freshMemoryPosition := safeAdd(freshMemoryPosition, 32) // increase fresh memory past new leaf
            }

            for { let i := 0 } lt(i, nodesLength) { i := safeAdd(i, 2) } { // loop through Leaf hashes at this height
              mstore(freshMemoryPosition, keccak256(safeAdd(memoryPosition, safeMul(i, 32)), 64)) // hash two leafs together
              freshMemoryPosition := safeAdd(freshMemoryPosition, 32) // increase fresh memory past new hash leaf
            }

            memoryPosition := safeSub(freshMemoryPosition, safeMul(nodesLength, 16)) // set new memory position
            nodesLength := div(nodesLength, 2) // half nodes (i.e. next height)

             // shim 1 to zero (stop), i.e. top height end..
            if lt(nodesLength, 2) { nodesLength := 0 }
          }

          // merkle root has been produced
          merkleTreeRoot := mload(memoryPosition)

          // write new fresh memory position
          mpush(Stack_FreshMemory, safeAdd(freshMemoryPosition, mul32(2)))
      }

      // Construct HTLC Digest Hash
      function constructHTLCDigest(preImage) -> digest {
          // Store PreImage in Memory
          mstore(mul32(1), preImage)

          // Construct Digest Hash
          digest := keccak256(mul32(1), mul32(1))
      }

      //
      // LOW LEVEL METHODS
      //

      // Safe Math Add
      function safeAdd(x, y) -> z {
          z := add(x, y)
          assertOrInvalidProof(or(eq(z, x), gt(z, x)), ErrorCode_SafeMathAdditionOverflow) // require((z = x + y) >= x, "ds-math-add-overflow");
      }

      // Safe Math Subtract
      function safeSub(x, y) -> z {
          z := sub(x, y)
          assertOrInvalidProof(or(eq(z, x), lt(z, x)), ErrorCode_SafeMathSubtractionUnderflow) // require((z = x - y) <= x, "ds-math-sub-underflow");
      }

      // Safe Math Multiply
      function safeMul(x, y) -> z {
          if gt(y, 0) {
              z := mul(x, y)
              assertOrInvalidProof(eq(div(z, y), x), ErrorCode_SafeMathMultiplyOverflow) // require(y == 0 || (z = x * y) / y == x, "ds-math-mul-overflow");
          }
      }

      // Safe Math Add3, Add4 Shorthand
      function add3(x, y, z) -> result {
          result := safeAdd(x, safeAdd(y, z))
      }
      function add4(x, y, z, k) -> result {
          result := safeAdd(x, safeAdd(y, safeAdd(z, k)))
      }

      // Common <= and >=
      function lte(v1, v2) -> result {
          result := or(lt(v1, v2), eq(v1, v2))
      }
      function gte(v1, v2) -> result {
          result := or(gt(v1, v2), eq(v1, v2))
      }

      // Safe Multiply by 32
      function mul32(length) -> result {
        result := safeMul(32, length)
      }

      // function combine 3 unit32 values together into one 32 byte combined value
      function combineUint32(val1, val2, val3, val4) -> combinedValue {
          mstore(safeAdd(mul32(2), 8), val4) // 2 bytes
          mstore(safeAdd(mul32(2), 6), val3) // 2 bytes
          mstore(safeAdd(mul32(2), 4), val2) // 2 bytes
          mstore(safeAdd(mul32(2), 2), val1) // 2 bytes

          // Grab combined value
          combinedValue := mload(mul32(3))
      }

      // split a combined value into three original chunks
      function splitCombinedUint32(combinedValue) -> val1, val2, val3, val4 {
          mstore(mul32(2), combinedValue)

          // grab values
          val1 := slice(safeAdd(mul32(2), 0), 2) // 2 byte slice
          val2 := slice(safeAdd(mul32(2), 2), 2) // 2 byte slice
          val3 := slice(safeAdd(mul32(2), 4), 2) // 2 byte slice
          val3 := slice(safeAdd(mul32(2), 6), 2) // 2 byte slice
      }

      // Transfer method helper
      function transfer(amount, tokenID, token, owner) {
          // Assert value owner / amount
          assertOrInvalidProof(gt(amount, 0), ErrorCode_TransferAmountUnderflow)
          assertOrInvalidProof(gt(owner, 0), ErrorCode_TransferOwnerInvalid)

          // Assert valid token ID
          assertOrInvalidProof(lt(tokenID, getNumTokens()), ErrorCode_TransferTokenIDOverflow)

          // Assert address is properly registered token
          assertOrInvalidProof(eq(tokenID, getTokens(token)), ErrorCode_TransferTokenAddress)

          // Ether Token
          if eq(token, EtherToken) {
              let result := call(owner, 21000, amount, 0, 0, 0, 0)
              assertOrInvalidProof(result, ErrorCode_TransferEtherCallResult)
          }

          // ERC20 "a9059cbb": "transfer(address,uint256)",
          if gt(token, 0) {
              // Construct ERC20 Transfer
              mstore(mul32(1), 0xa9059cbb)
              mstore(mul32(2), owner)
              mstore(mul32(3), amount)

              // Input Details
              let inputStart := safeAdd(mul32(1), 28)
              let inputLength := 68

              // ERC20 Call
              let result := call(token, 400000, 0, inputStart, inputLength, 0, 0)
              assertOrInvalidProof(result, ErrorCode_TransferERC20Result)
          }
      }

      // Virtual Memory Stack Push (for an additional 32 stack positions)
      function mpush(pos, val) { // Memory Push
          mstore(add(Stack_MemoryPosition, mul32(pos)), val)
      }

      // Virtual Memory Stack Get
      function mstack(pos) -> result { // Memory Stack
          result := mload(add(Stack_MemoryPosition, mul32(pos)))
      }

      // Virtual Stack Pop
      function mpop(pos) { // Memory Pop
          mstore(add(Stack_MemoryPosition, mul32(pos)), 0)
      }


      // Memory Slice (within a 32 byte chunk)
      function slice(position, length) -> result {
          if gt(length, 32) { revert(0, 0) } // protect against overflow

          result := div(mload(position), exp(2, safeSub(256, safeMul(length, 8))))
      }

      // Solidity Storage Key: mapping(bytes32 => bytes32)
      function mappingStorageKey(key, storageIndex) -> storageKey {
          mstore(32, key)
          mstore(64, storageIndex)
          storageKey := keccak256(32, 64)
      }

      // Solidity Storage Key: mapping(bytes32 => mapping(bytes32 => bytes32)
      function mappingStorageKey2(key, key2, storageIndex) -> storageKey {
          mstore(32, key)
          mstore(64, storageIndex)
          mstore(96, key2)
          mstore(128, keccak256(32, 64))
          storageKey := keccak256(96, 64)
      }

      // load a 32 byte chunk with a 32 byte offset chunk from position
      function load32(memoryPosition, chunkOffset) -> result {
        result := mload(add(memoryPosition, safeMul(32, chunkOffset)))
      }

      // Assert True or Invalid Proof
      function assertOrInvalidProof(arg, errorCode) {
        if lt(arg, 1) {
          // Set Error Code In memory
          mstore(mul32(1), errorCode)

          // Revert and Return Error Code
          revert(mul32(1), mul32(1))

          // Just incase we add a stop
          stop()
        }
      }

      // ECRecover Helper: hashPosition (32 bytes), signaturePosition (65 bytes) tight packing VRS
      function ecrecoverPacked(digestHash, signatureMemoryPosition) -> account {
          mstore(32, digestHash) // load in hash
          mstore(64, 0) // zero pas
          mstore(95, mload(signatureMemoryPosition))
          mstore(96, mload(safeAdd(signatureMemoryPosition, 1)))
          mstore(128, mload(safeAdd(signatureMemoryPosition, 33)))

          let result := call(3000, 1, 0, 32, 128, 128, 32) // 4 chunks, return at 128
          if eq(result, 0) { revert(0, 0) }

          account := mload(128) // set account
      }

      //
      // SETTERS & GETTER METHODS
      // Solidity setters and getters for side-chain state storage
      //

      // GET mapping(bytes32 => uint256) public deposits; // STORAGE 0
      function getDeposits(depositHashId) -> result {
        result := sload(mappingStorageKey(depositHashId, Storage_deposits))
      }

      // GET mapping(uint256 => mapping(bytes32 => bool)) publica withdrawals; // STORAGE 1
      function getWithdrawals(blockHeight, withdrawalHashID) -> result {
        result := sload(mappingStorageKey2(blockHeight, withdrawalHashID, Storage_withdrawals))
      }

      // SET mapping(uint256 => mapping(bytes32 => bool)) publica withdrawals; // STORAGE 1
      function setWithdrawals(blockHeight, withdrawalHashID, hasWithdrawn) {
          sstore(mappingStorageKey2(blockHeight, withdrawalHashID, Storage_withdrawals), hasWithdrawn)
      }

      // GET mapping(bytes32 => uint256) public blockTransactionRoots; // STORAGE 2
      function getBlockTransactionRoots(transactionRoot) -> result {
        result := sload(mappingStorageKey(transactionRoot, Storage_blockTransactionRoots))
      }

      // GET mapping(uint256 => bytes32) public blockCommitments; // STORAGE 3
      function getBlockCommitments(blockHeight) -> result {
        result := sload(mappingStorageKey(blockHeight, Storage_blockCommitments))
      }

      // GET mapping(address => uint256) public tokens; // STORAGE 4
      function getTokens(tokenAddress) -> result {
        result := sload(mappingStorageKey(tokenAddress, Storage_tokens))

        // Ether token should always be zero
        if eq(tokenAddress, 0) {
          assertOrInvalidProof(eq(result, 0), ErrorCode_InvalidTokenAddress)
        }

        // ERC20 should always be above zero
        if gt(tokenAddress, 0) {
          assertOrInvalidProof(gt(result, 0), ErrorCode_InvalidTokenAddress)
        }
      }

      // GET uint256 public numTokens; // STORAGE 5
      function getNumTokens() -> result {
        result := sload(Storage_numTokens)
      }


      // SET uint256 public blockTip; // STORAGE 6
      function getBlockTip() -> result {
        result := sload(Storage_blockTip)
      }

      // SET blockTip() // STORAGE 6
      function setBlockTip(tip) {
          sstore(Storage_blockTip, tip)
      }


      // GET address public blockProducer; // STORAGE 7
      function getBlockProducer() -> result {
        result := sload(Storage_blockProducer)
      }

      // SET address public blockProducer // STORAGE 7
      function setBlockProducer(producer) {
          sstore(Storage_blockProducer, producer)
      }
    }
  `);

console.log(yulp.print(source.results));
