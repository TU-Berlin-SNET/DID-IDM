# Description
The repository comprises a prototype of a DID-compliant identifier management system in the form of Smart Contracts (written in Solidity) for Ethereum. DID refers to Decentralized Identifiers according to the W3C recommendation [Decentralized Identifiers (DIDs) v1.0]( https://www.w3.org/TR/did-1.0/). The prototype was designed and implemented based on the ideas sketched in the research article "[Governance of Ledger-Anchored Decentralized Identifiers](https://arxiv.org/)". For a comprehensive description of the concepts implemented in the prototype, readers are encouraged to consult the linked article.

The `DIDRegistry` contract serves as the verifiable data registry for the storage and retrieval of DIDs and the associated meta data (DID documents). Governance method contracts implement each a different DID update coordination mechanism, making it possible to coordinate an DID update among multiple entities on-chain. Each DID is customizable with its own DID update coordination mechanism. 

# Installation
This repository follows the structure of basic Hardhat project. It comes with a  multipe contracts, tests for these contracts, and a Hardhat Ignition module that deploys that contracts.

To execute the tests and the code for Gas cost calculations exevute following commands
```shell
// install needed packages 
npm install 
// run the test scripts
npx hardhat test
```

# Repository structure
In contracts folder you can find `DIDregistry` and `DidRegistryRouter` contract and folders with DID update coordination contracts, interfaces, and verifier contracts.





