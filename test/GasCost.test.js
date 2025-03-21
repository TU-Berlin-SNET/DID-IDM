const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gas Measurements", function() {
  const results = {
    WeightedMajority: {},
    WeightedMajorityVC: {},
    WeightedMajorityToken: {},
    NofM: {},
    TimeLimited: {},
    Independent: {},
    OffChainController: {},
    OffChainToken: {},
    OffChainVC: {}

  };

  function sortVoteDataToken(addresses, voteSignatures, tokenSignatures, tokens) {
    let voteData = addresses.map((addr, i) => ({
      address: addr,
      voteSignature: voteSignatures[i],
      tokenSignature: tokenSignatures[i],
      token: tokens[i]
    }));

    voteData.sort((a, b) => {
      return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
    });

    return {
      sortedAddresses: voteData.map(d => d.address),
      sortedVoteSignatures: voteData.map(d => d.voteSignature),
      sortedTokenSignatures: voteData.map(d => d.tokenSignature),
      sortedTokens: voteData.map(d => d.token)
    };
  }

  function sortVoteData(addresses, signatures) {
    let voteData = addresses.map((addr, i) => ({
      address: addr,
      signature: signatures[i]
    }));

    voteData.sort((a, b) => {
      return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
    });

    return {
      sortedAddresses: voteData.map(d => d.address),
      sortedSignatures: voteData.map(d => d.signature)
    };
  }

  function hashCredentials(strings, numbers, bools, addresses) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string[]", "uint256[]", "bool[]", "address[]"],
      [strings, numbers, bools, addresses]
    );
    return ethers.keccak256(encoded)
  }

  function hashAddressWeightToken(ownerAddress, tokenWeight) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint"],
      [ownerAddress, tokenWeight]
    );
    return ethers.keccak256(encoded)
  }

  function hashStringToken(token) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      [token]
    );
    return ethers.keccak256(encoded)
  }

  function hashAddressToken(token) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address"],
      [token]
    );
    return ethers.keccak256(encoded)
  }

  let DIDRegistry, DIDRegistryRouter, WeightedMajorityGovernance, NofMGovernance, TimeLimitedGovernance, IndependentGovernance;
  let didRegistry, didRegistryRouter, weightedGov, nofmGov, timeLimitedGov, independentgov;
  let owner, controller1, voters;
  const numberOfVotersToTest = [9, 19, 39, 59, 79, 99];
  const numberofIndependent = [10, 20, 40, 60, 80, 100];
  const MAX_VOTERS = 100;

  async function measureGas(tx) {
    const receipt = await tx.wait();
    return receipt.gasUsed;
  }

  beforeEach(async function() {
    [owner, controller1, ...voters] = await ethers.getSigners();

    // Deploy all contracts
    DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    Credentials = await ethers.getContractFactory("Credentials");
    DIDRegistryRouter = await ethers.getContractFactory("DIDRegistryRouter");
    WeightedMajorityGovernance = await ethers.getContractFactory("WeightedMajorityGovernance");
    NofMGovernance = await ethers.getContractFactory("NofMGovernance");
    TimeLimitedGovernance = await ethers.getContractFactory("TimeLimitedGovernance");
    IndependentGovernance = await ethers.getContractFactory("IndependentGovernance");
    AgeVerifier = await ethers.getContractFactory("AgeVerifier");
    OffChainController = await ethers.getContractFactory("OffChainGovernanceController");
    OffChainVC = await ethers.getContractFactory("OffChainVC");
    OffChainToken = await ethers.getContractFactory("OffChainGovernanceToken");



    didRegistry = await DIDRegistry.deploy();
    credentials = await Credentials.deploy();
    didRegistryRouter = await DIDRegistryRouter.deploy(didRegistry.target, credentials.target);
    ageVerifier = await AgeVerifier.deploy(didRegistryRouter.target, credentials.target);
    weightedGov = await WeightedMajorityGovernance.deploy(didRegistry.target, credentials.target);
    nofmGov = await NofMGovernance.deploy(didRegistry.target);
    timeLimitedGov = await TimeLimitedGovernance.deploy(didRegistry.target);
    independentgov = await IndependentGovernance.deploy(didRegistry.target);
    offChainController = await OffChainController.deploy(credentials.target, didRegistry.target);
    offChainVC = await OffChainVC.deploy(credentials.target, didRegistry.target);
    offChainToken = await OffChainToken.deploy(credentials.target, didRegistry.target);

    await didRegistry.setDIDRegistryRouterAddress(didRegistryRouter.target);
  });

  // Setup functions for each governance type
  async function setupInitialOffChainController(numVoters) {

    const votersList = voters.slice(0, numVoters);


    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [owner.address, controller1.address, ...votersList.map(v => v.address)],
      contractAddres: offChainController.target,
      contractPublicKey: "publicKey123",
      intArgs: [Math.ceil(numVoters / 2)],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 0,
      verifierContracts: [],
      issuers: [],
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(
      "publicKey1",
      "authMethod1",
      [governanceMethod]
    );

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber(),
    };

    const createTx = await didRegistryRouter.connect(owner).createProposalWithControllers(
      owner.address,
      0,
      0,
      newDidDocument,
      [governanceMethod],
    );

    return { votersList, createTx };
  }
  async function setupInitialOffChainToken(numVoters) {

    const votersList = voters.slice(0, numVoters);


    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [],
      //controllers: [owner.address, controller1.address, ...votersList.map(v => v.address)],
      contractAddres: offChainToken.target,
      contractPublicKey: "publicKey123",
      intArgs: [Math.ceil(numVoters / 2)],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 1,
      verifierContracts: [],
      issuers: [controller1.address],
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(
      "publicKey1",
      "authMethod1",
      [governanceMethod]
    );

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber(),
    };

    const proposalTokenjsHash = hashStringToken("access");
    const proposalTokenSignature = await controller1.signMessage(ethers.toBeArray(proposalTokenjsHash))

    const createTx = await didRegistryRouter.connect(controller1).createProposalWithToken(
      owner.address,
      0,
      newDidDocument,
      [governanceMethod],
      0,
      "access",
      proposalTokenSignature
    );

    return { votersList, createTx };
  }

  async function setupInitialOffChainVC(numVoters) {

    const votersList = voters.slice(0, numVoters);


    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [],
      contractAddres: offChainVC.target,
      contractPublicKey: "publicKey123",
      intArgs: [Math.ceil(numVoters / 2)],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 3,
      verifierContracts: [ageVerifier.target],
      issuers: [controller1.address],
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(
      "publicKey1",
      "authMethod1",
      [governanceMethod]
    );

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber(),
    };

    const proposalStrings = ["age_verification"];
    const proposalNumbers = [18];
    const proposalBools = [true];
    const proposalAddresses = [owner.address];

    const proposalCredHash = hashCredentials(proposalStrings, proposalNumbers, proposalBools, proposalAddresses);
    const proposalCredSignature = await controller1.signMessage(ethers.getBytes(proposalCredHash));


    const createTx = await ageVerifier.connect(controller1).createProposal(
      owner.address,
      0,
      newDidDocument,
      [governanceMethod],
      proposalStrings,
      proposalNumbers,
      proposalBools,
      proposalAddresses,
      proposalCredSignature,
      controller1.address,
      0
    );

    return { votersList, createTx };
  }

  async function setupInitialWeightedGovernance(numVoters) {
    const votersList = voters.slice(0, numVoters);
    const weights = Array(numVoters + 2).fill(1);
    weights.push(Math.ceil(numVoters / 2));
    weights.push(Math.ceil(numVoters / 2));

    const initialGovMethod = {
      methodName: "Initial",
      controllers: [owner.address, controller1.address, ...votersList.map(v => v.address)],
      contractAddres: weightedGov.target,
      contractPublicKey: "publicKey123",
      intArgs: weights,
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 0,
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0,
      verifierContracts: [],
      issuers: []
    };

    await didRegistry.connect(owner).createDIDDocument(
      "initialKey",
      "initialAuth",
      [initialGovMethod]
    );

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    const createTx = await didRegistryRouter.connect(owner).createProposalWithControllers(
      owner.address, 0, 0, newDidDocument, [initialGovMethod]
    );

    return { votersList, createTx };
  }

  async function setupInitialWeightedVCGovernance(numVoters) { //verifiable credentials
    const votersList = voters.slice(0, numVoters);
    /*const weights = Array(numVoters + 2).fill(1);
    weights.push(Math.ceil(numVoters/2));
    weights.push(Math.ceil(numVoters/2)); */

    const initialGovMethod = {
      methodName: "Initial",
      controllers: [],
      contractAddres: weightedGov.target,
      contractPublicKey: "publicKey123",
      intArgs: [Math.ceil(numVoters / 2) * 22, Math.ceil(numVoters / 2) * 22],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 3,
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0,
      verifierContracts: [ageVerifier.target],
      issuers: [controller1.address]
    };

    await didRegistry.connect(owner).createDIDDocument(
      "initialKey",
      "initialAuth",
      [initialGovMethod]
    );

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    const strArr = ["Mario"];
    const numArr = [22];
    const boolArr = [true];
    const addrArr = [owner.address];
    const jsHash = hashCredentials(strArr, numArr, boolArr, addrArr);
    const signature = await controller1.signMessage(ethers.toBeArray(jsHash));

    const createTx = await ageVerifier.connect(owner).createProposal(
      owner.address,
      0,
      newDidDocument,
      [initialGovMethod],
      // credentials 
      strArr,
      numArr,
      boolArr,
      addrArr,
      signature,
      controller1.address, // credentials issuer address
      0 // index of the ageVerifer in simpleGovMethod
    );

    //await didRegistry.getProposal(owner.address, 0);

    return { votersList, createTx };
  }

  async function setupInitialWeightedTGovernance(numVoters) { //token
    const votersList = voters.slice(0, numVoters);
    const weights = Array(numVoters + 2).fill(1);
    weights.push(Math.ceil(numVoters / 2));
    weights.push(Math.ceil(numVoters / 2));

    const initialGovMethod = {
      methodName: "Initial",
      controllers: [],
      contractAddres: weightedGov.target,
      contractPublicKey: "publicKey123",
      intArgs: [Math.ceil(numVoters / 2) * 20, Math.ceil(numVoters / 2) * 20],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 1,
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0,
      verifierContracts: [],
      issuers: [controller1.address]
    };

    await didRegistry.connect(owner).createDIDDocument(
      "initialKey",
      "initialAuth",
      [initialGovMethod]
    );

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };


    const token = hashStringToken("access");
    const signature = await controller1.signMessage(ethers.toBeArray(token))

    const createTx = await didRegistryRouter.connect(controller1).createProposalWithToken(
      owner.address, 0, newDidDocument, [initialGovMethod], 0, "access", signature
    );

    return { votersList, createTx };
  }

  async function setupInitialNofMGovernance(numVoters) {
    const votersList = voters.slice(0, numVoters);
    const threshold = Math.floor(numVoters / 2) + 1;

    const initialGovMethod = {
      methodName: "Initial",
      controllers: [owner.address, controller1.address, ...votersList.map(v => v.address)],
      contractAddres: nofmGov.target,
      contractPublicKey: "publicKey123",
      intArgs: [threshold],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 0,
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0,
      verifierContracts: [],
      issuers: []
    };

    await didRegistry.connect(owner).createDIDDocument(
      "initialKey",
      "initialAuth",
      [initialGovMethod]
    );

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    const createTx = await didRegistryRouter.connect(owner).createProposalWithControllers(
      owner.address, 0, 0, newDidDocument, [initialGovMethod]
    );

    return { votersList, createTx, threshold };
  }

  async function setupInitialTimeLimitedGovernance(numVoters) {
    const votersList = voters.slice(0, numVoters - 2);
    const votingPeriod = 3600; // 1 hour in seconds

    const initialGovMethod = {
      methodName: "Initial",
      controllers: [owner.address, ...votersList.map(v => v.address)],
      contractAddres: timeLimitedGov.target,
      contractPublicKey: "publicKey123",
      intArgs: [votingPeriod],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 0,
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0,
      verifierContracts: [],
      issuers: []
    };

    await didRegistry.connect(owner).createDIDDocument(
      "initialKey",
      "initialAuth",
      [initialGovMethod]
    );

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    const createTx = await didRegistryRouter.connect(owner).createProposalWithControllers(
      owner.address, 0, 0, newDidDocument, [initialGovMethod]
    );

    return { votersList, createTx };
  }

  async function setupInitialIndependentGovernance(numVoters) {
    const votersList = voters.slice(0, numVoters);

    const initialGovMethod = {
      methodName: "Initial",
      controllers: [owner.address, controller1.address, ...votersList.map(v => v.address)],
      contractAddres: independentgov.target,
      contractPublicKey: "publicKey123",
      intArgs: [],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 0,
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0,
      verifierContracts: [],
      issuers: []
    };

    await didRegistry.connect(owner).createDIDDocument(
      "initialKey",
      "initialAuth",
      [initialGovMethod]
    );

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    const createTx = await didRegistryRouter.connect(owner).createProposalWithControllers(
      owner.address, 0, 0, newDidDocument, [initialGovMethod]
    );

    return { votersList, createTx };
  }

  // Generic function to create a new proposal
  async function createNewProposal(governanceMethod) {
    const newDidDocument = {
      owner: owner.address,
      publicKey: "finalPublicKey",
      authenticationMethod: "finalAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    return await didRegistryRouter.connect(owner).createProposalWithControllers(
      owner.address, 0, 0, newDidDocument, [governanceMethod]
    );
  }

  async function createNewProposalVC(governanceMethod) {
    const newDidDocument = {
      owner: owner.address,
      publicKey: "finalPublicKey",
      authenticationMethod: "finalAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    const strArr = ["Mario"];
    const numArr = [22];
    const boolArr = [true];
    const addrArr = [controller1.address];
    const jsHash = hashCredentials(strArr, numArr, boolArr, addrArr);
    const signature = await controller1.signMessage(ethers.toBeArray(jsHash));

    return await ageVerifier.connect(controller1).createProposal(
      owner.address,
      0,
      newDidDocument,
      [governanceMethod],
      // credentials 
      strArr,
      numArr,
      boolArr,
      addrArr,
      signature,
      controller1.address, // credentials issuer address
      0 // index of the ageVerifer in simpleGovMethod
    );
  }

  async function createNewProposalToken(governanceMethod, token, signature) {
    const newDidDocument = {
      owner: owner.address,
      publicKey: "finalPublicKey",
      authenticationMethod: "finalAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    return await didRegistryRouter.connect(controller1).createProposalWithToken(
      owner.address, 0, newDidDocument, [governanceMethod], 0, token, signature
    );
  }
  // Test cases for each governance type
  for (const numVoters of numberOfVotersToTest) {
    it(`Measure OffChainController governance process gas costs with ${numVoters} voters`, async function() {
      const { votersList, createTx } = await setupInitialOffChainController(numVoters);
      const initialCreateGas = await measureGas(createTx);

      let totalVotingGas = ethers.getBigInt(0);
      let votesCount = 0;

      const governanceMethod = {
        methodName: "OffChainVoting",
        controllers: [owner.address, controller1.address, ...votersList.map(v => v.address)],
        contractAddres: offChainController.target,
        contractPublicKey: "publicKey123",
        intArgs: [Math.ceil(numVoters / 2)],
        stringArgs: [],
        boolArgs: [],
        governanceMethodType: 0,
        verifierContracts: [],
        issuers: [],
        expiresAt: 0,
        blockedUntil: 0,
        editRightsLevel: 0
      };


      const newDidDocument = {
        owner: owner.address,
        publicKey: "newPublicKey",
        authenticationMethod: "newAuthMethod",
        lastChanged: await ethers.provider.getBlockNumber(),
      };

      const proposalTx = await didRegistryRouter.connect(owner).createProposalWithControllers(
        owner.address,
        0,
        0,
        newDidDocument,
        [governanceMethod],
      );

      const newProposalGas = await measureGas(proposalTx);
      const receipt = await proposalTx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const proposalHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint", "uint", "address", "uint"],
          [0, 0, owner.address, block.timestamp - 1]
        )
      );

      const voteMessageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["bytes32", "bool"],
          [proposalHash, true]
        )
      );

      // Get required number of signatures
      const requiredVotes = Math.ceil(numVoters / 2);
      const voteData = [];

      /*const voterr = owner;
      const voterrr = controller1;
      const signature = await voterr.signMessage(ethers.getBytes(voteMessageHash));
      const signaturee = await voterrr.signMessage(ethers.getBytes(voteMessageHash));
      voteData.push({
          address: voterr.address,
          signature: signature
      });
      voteData.push({
          address: voterrr.address,
          signature: signaturee
      });*/

      // Create vote data maintaining the pairing
      for (let i = 0; i < requiredVotes; i++) {
        const voter = votersList[i];
        const signature = await voter.signMessage(ethers.getBytes(voteMessageHash));
        voteData.push({
          address: voter.address,
          signature: signature
        });
        votesCount++;
      }

      // Sort while maintaining the pairing
      //voteData.sort((a, b) => a.address.toLowerCase().localeCompare(b.address.toLowerCase()));

      const { sortedAddresses, sortedSignatures } = sortVoteData(
        voteData.map(d => d.address),
        voteData.map(d => d.signature)
      );

      //const sortedAddresses = voteData.map(d => d.address);
      //const sortedSignatures = voteData.map(d => d.signature);

      const voteTx = await offChainController.submitVotes(
        0,
        owner.address,
        sortedAddresses,
        Array(sortedAddresses.length).fill(true),
        sortedSignatures
      );

      // Measure gas
      const voteGas = await measureGas(voteTx);

      // Update results
      results.OffChainController[requiredVotes] = {
        initialCreateGas: initialCreateGas.toString(),
        averageVoteGas: (voteGas / BigInt(votesCount)).toString(),
        totalVotingGas: voteGas.toString(),
        newProposalGas: newProposalGas.toString(),
        totalProcessGas: (initialCreateGas + voteGas + newProposalGas).toString(),
        //votesSubmitted: requiredVotes,
        //gasUsed: voteGas.toString()
      };
    });

    it(`Measure OffChainToken governance process gas costs with ${numVoters} voters`, async function() {
      const { votersList, createTx } = await setupInitialOffChainToken(numVoters);
      const initialCreateGas = await measureGas(createTx);

      let totalVotingGas = ethers.getBigInt(0);
      let votesCount = 0;

      const governanceMethod = {
        methodName: "OffChainVoting",
        controllers: [],
        contractAddres: offChainToken.target,
        contractPublicKey: "publicKey123",
        intArgs: [Math.ceil(numVoters / 2)],
        stringArgs: [],
        boolArgs: [],
        governanceMethodType: 1,
        verifierContracts: [],
        issuers: [controller1.address],
        expiresAt: 0,
        blockedUntil: 0,
        editRightsLevel: 0
      };


      const newDidDocument = {
        owner: owner.address,
        publicKey: "newPublicKey",
        authenticationMethod: "newAuthMethod",
        lastChanged: await ethers.provider.getBlockNumber(),
      };

      const proposalTokenjsHash = hashStringToken("access");
      const proposalTokenSignature = await controller1.signMessage(ethers.toBeArray(proposalTokenjsHash))

      const proposalTx = await didRegistryRouter.connect(controller1).createProposalWithToken(
        owner.address,
        0,
        newDidDocument,
        [governanceMethod],
        0,
        "access",
        proposalTokenSignature
      );

      const newProposalGas = await measureGas(proposalTx);
      const receipt = await proposalTx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const proposalHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint", "uint", "address", "uint"],
          [0, 0, owner.address, block.timestamp - 1]
        )
      );

      const voteMessageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["bytes32", "bool"],
          [proposalHash, true]
        )
      );

      // Get required number of signatures
      const requiredVotes = Math.ceil(numVoters / 2);
      const voteData = [];

      for (let i = 0; i < requiredVotes; i++) {
        const voter = votersList[i];

        // Generate vote signature
        const voteSignature = await voter.signMessage(ethers.getBytes(voteMessageHash));

        // Generate token signature
        const addressHash = hashAddressToken(voter.address);

        const tokenSignature = await controller1.signMessage(ethers.getBytes(addressHash));

        voteData.push({
          address: voter.address,
          voteSignature: voteSignature,
          tokenSignature: tokenSignature,
          token: voter.address  // Using address as token for this example
        });
        votesCount++;
      }

      // Sort all data while maintaining relationships
      const {
        sortedAddresses,
        sortedVoteSignatures,
        sortedTokenSignatures,
        sortedTokens
      } = sortVoteDataToken(
        voteData.map(d => d.address),
        voteData.map(d => d.voteSignature),
        voteData.map(d => d.tokenSignature),
        voteData.map(d => d.token)
      );

      //const sortedAddresses = voteData.map(d => d.address);
      //const sortedSignatures = voteData.map(d => d.signature);

      const voteParams = {
        voters: sortedAddresses,
        votes: Array(sortedAddresses.length).fill(true),
        signatures: sortedVoteSignatures,
        tokenSignatures: sortedTokenSignatures,
        tokens: sortedTokens,
        issuer: controller1.address,
        issuerIndex: 0
    };



      const voteTx = await offChainToken.submitVotes(
        0,
        owner.address,
        voteParams
    );

      // Measure gas
      const voteGas = await measureGas(voteTx);

      // Update results
      results.OffChainToken[requiredVotes] = {
        initialCreateGas: initialCreateGas.toString(),
        averageVoteGas: (voteGas / BigInt(votesCount)).toString(),
        totalVotingGas: voteGas.toString(),
        newProposalGas: newProposalGas.toString(),
        totalProcessGas: (initialCreateGas + voteGas + newProposalGas).toString(),
        //votesSubmitted: requiredVotes,
        //gasUsed: voteGas.toString()
      };
    });

    it(`Measure OffChainVC governance process gas costs with ${numVoters} voters`, async function() {
      const { votersList, createTx } = await setupInitialOffChainVC(numVoters);
      const initialCreateGas = await measureGas(createTx);

      let totalVotingGas = ethers.getBigInt(0);
      let votesCount = 0;

      const governanceMethod = {
        methodName: "OffChainVoting",
        controllers: [],
        contractAddres: offChainVC.target,
        contractPublicKey: "publicKey123",
        intArgs: [Math.ceil(numVoters / 2)],
        stringArgs: [],
        boolArgs: [],
        governanceMethodType: 3,
        verifierContracts: [ageVerifier.target],
        issuers: [controller1.address],
        expiresAt: 0,
        blockedUntil: 0,
        editRightsLevel: 0
      };


      const newDidDocument = {
        owner: owner.address,
        publicKey: "newPublicKey",
        authenticationMethod: "newAuthMethod",
        lastChanged: await ethers.provider.getBlockNumber(),
      };

      const proposalStrings = ["age_verification"];
      const proposalNumbers = [18];
      const proposalBools = [true];
      const proposalAddresses = [owner.address];

      const proposalCredHash = hashCredentials(proposalStrings, proposalNumbers, proposalBools, proposalAddresses);
      const proposalCredSignature = await controller1.signMessage(ethers.getBytes(proposalCredHash));

      const proposalTx = await ageVerifier.connect(controller1).createProposal(
        owner.address,
        0,
        newDidDocument,
        [governanceMethod],
        proposalStrings,
        proposalNumbers,
        proposalBools,
        proposalAddresses,
        proposalCredSignature,
        controller1.address,
        0
      );

      const newProposalGas = await measureGas(proposalTx);
      const receipt = await proposalTx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const proposalHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint", "uint", "address", "uint"],
          [0, 0, owner.address, block.timestamp - 1]
        )
      );

      const voteMessageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["bytes32", "bool"],
          [proposalHash, true]
        )
      );

      // Get required number of signatures
      const requiredVotes = Math.ceil(numVoters / 2);
      const votesData = [];

      for (let i = 0; i < requiredVotes; i++) {
        const voter = votersList[i];

        // Generate vote signature
        const voteSignature = await voter.signMessage(ethers.getBytes(voteMessageHash));

        const voterStrings = ["age_verification"];
        const voterNumbers = [18];
        const voterBools = [true];
        const voterAddresses = [voter.address];

        const credHash = hashCredentials(voterStrings, voterNumbers, voterBools, voterAddresses);
        const credSignature = await controller1.signMessage(ethers.getBytes(credHash));

        votesData.push({
          voter: voter.address,
          vote: true,
          voteSignature: voteSignature,
          credential: {
            strings: voterStrings,
            numbers: voterNumbers,
            bools: voterBools,
            addresses: voterAddresses,
            signature: credSignature
          }
        });
        votesCount++;
      }

      // Sort the votes data by voter address
      votesData.sort((a, b) => a.voter.toLowerCase().localeCompare(b.voter.toLowerCase()));

      // Create the structured vote data array that matches the contract's expectations
      const structuredVotesData = votesData.map(d => ({
        voter: d.voter,
        vote: d.vote,
        voteSignature: d.voteSignature,
        credential: {
          strings: d.credential.strings,
          numbers: d.credential.numbers,
          bools: d.credential.bools,
          addresses: d.credential.addresses,
          signature: d.credential.signature
        }
      }));

      // Submit votes with the correct structure
      const voteTx = await offChainVC.submitVotes(
        0,
        owner.address,
        structuredVotesData,
        controller1.address,
        0
      );

      // Measure gas
      const voteGas = await measureGas(voteTx);

      // Update results
      results.OffChainVC[requiredVotes] = {
        initialCreateGas: initialCreateGas.toString(),
        averageVoteGas: (voteGas / BigInt(votesCount)).toString(),
        totalVotingGas: voteGas.toString(),
        newProposalGas: newProposalGas.toString(),
        totalProcessGas: (initialCreateGas + voteGas + newProposalGas).toString(),
        //votesSubmitted: requiredVotes,
        //gasUsed: voteGas.toString()
      };
    });


    it(`Measure WeightedMajority governance process gas costs with ${numVoters} voters`, async function() {
      const { votersList, createTx } = await setupInitialWeightedGovernance(numVoters);
      const initialCreateGas = await measureGas(createTx);

      let totalVotingGas = ethers.getBigInt(0);
      let votesCount = 0;

      for (const voter of votersList) {
        const isApproved = await weightedGov.isApproved(0);
        if (!isApproved) {
          const voteTx = await weightedGov.connect(voter).voteWithController(0, true, votesCount + 2);
          const voteGas = await measureGas(voteTx);
          totalVotingGas += voteGas;
          votesCount++;
        } else {
          break;
        }
      }

      const newProposalTx = await createNewProposal({
        methodName: "WeightedVoting",
        controllers: [owner.address, controller1.address, ...votersList.map(v => v.address)],
        contractAddres: weightedGov.target,
        contractPublicKey: "publicKey123",
        intArgs: Array(numVoters + 2).fill(1),
        stringArgs: [],
        boolArgs: [],
        governanceMethodType: 0,
        expiresAt: 0,
        blockedUntil: 0,
        editRightsLevel: 0,
        verifierContracts: [],
        issuers: []
      });
      const newProposalGas = await measureGas(newProposalTx);

      results.WeightedMajority[votesCount] = {
        initialCreateGas: initialCreateGas.toString(),
        averageVoteGas: (totalVotingGas / BigInt(votesCount)).toString(),
        totalVotingGas: totalVotingGas.toString(),
        newProposalGas: newProposalGas.toString(),
        totalProcessGas: (initialCreateGas + totalVotingGas + newProposalGas).toString()
      };
    });

    it(`Measure WeightedMajority governance with VC process gas costs with ${numVoters} voters`, async function() {
      const { votersList, createTx } = await setupInitialWeightedVCGovernance(numVoters);
      const initialCreateGas = await measureGas(createTx);

      let totalVotingGas = ethers.getBigInt(0);
      let votesCount = 0;
      const strArr = ["Mario"];
      const numArr = [22];
      const boolArr = [true];

      for (const voter of votersList) {
        const addrArr = [voter.address];
        const jsHash = hashCredentials(strArr, numArr, boolArr, addrArr);
        const signature = await controller1.signMessage(ethers.toBeArray(jsHash));

        const isApproved = await weightedGov.isApproved(0);
        if (!isApproved) {
          const voteTx = await weightedGov.connect(voter).voteWithVC(
            0, // proposalId
            true,
            strArr,
            numArr,
            boolArr,
            addrArr,
            signature,
            controller1.address, // credentials issuer address
            0 // index of the issuer  in simpleGovMethod
          );
          //const voteTx = await weightedGov.connect(voter).voteWithController(0, true, votesCount+2);
          const voteGas = await measureGas(voteTx);
          totalVotingGas += voteGas;
          votesCount++;
        } else {
          break;
        }
      }

      const newProposalTx = await createNewProposalVC({
        methodName: "WeightedVoting",
        controllers: [],
        contractAddres: weightedGov.target,
        contractPublicKey: "publicKey123",
        intArgs: [Math.ceil(numVoters / 2) * 22, Math.ceil(numVoters / 2) * 22],
        stringArgs: [],
        boolArgs: [],
        governanceMethodType: 0,
        expiresAt: 0,
        blockedUntil: 0,
        editRightsLevel: 0,
        verifierContracts: [],
        issuers: []
      });
      const newProposalGas = await measureGas(newProposalTx);

      results.WeightedMajorityVC[votesCount] = {
        initialCreateGas: initialCreateGas.toString(),
        averageVoteGas: (totalVotingGas / BigInt(votesCount)).toString(),
        totalVotingGas: totalVotingGas.toString(),
        newProposalGas: newProposalGas.toString(),
        totalProcessGas: (initialCreateGas + totalVotingGas + newProposalGas).toString()
      };
    });

    it(`Measure WeightedMajority governance with Token process gas costs with ${numVoters} voters`, async function() {
      const { votersList, createTx } = await setupInitialWeightedTGovernance(numVoters);
      const initialCreateGas = await measureGas(createTx);

      let totalVotingGas = ethers.getBigInt(0);
      let votesCount = 0;

      for (const voter of votersList) {
        const jsHash = hashAddressWeightToken(voter.address, 20);
        const signature = await controller1.signMessage(ethers.toBeArray(jsHash))

        const isApproved = await weightedGov.isApproved(0);
        if (!isApproved) {
          const voteTx = await weightedGov.connect(voter).voteWithToken(
            0, // proposalId
            true,
            20,
            voter.address,
            signature,
            controller1.address, // credentials issuer address
            0 // index of the issuer  in simpleGovMethod
          );
          //const voteTx = await weightedGov.connect(voter).voteWithController(0, true, votesCount+2);
          const voteGas = await measureGas(voteTx);
          totalVotingGas += voteGas;
          votesCount++;
        } else {
          break;
        }
      }

      const jsHash = hashStringToken("access");
      const signature = await controller1.signMessage(ethers.toBeArray(jsHash))

      const newProposalTx = await createNewProposalToken({
        methodName: "Initial",
        controllers: [],
        contractAddres: weightedGov.target,
        contractPublicKey: "publicKey123",
        intArgs: [Math.ceil(numVoters / 2) * 20, Math.ceil(numVoters / 2) * 20],
        stringArgs: [],
        boolArgs: [],
        governanceMethodType: 1,
        expiresAt: 0,
        blockedUntil: 0,
        editRightsLevel: 0,
        verifierContracts: [],
        issuers: [controller1.address]
      }, "access", signature);
      const newProposalGas = await measureGas(newProposalTx);

      results.WeightedMajorityToken[votesCount] = {
        initialCreateGas: initialCreateGas.toString(),
        averageVoteGas: (totalVotingGas / BigInt(votesCount)).toString(),
        totalVotingGas: totalVotingGas.toString(),
        newProposalGas: newProposalGas.toString(),
        totalProcessGas: (initialCreateGas + totalVotingGas + newProposalGas).toString()
      };
    });

    it(`Measure NofM governance process gas costs with ${numVoters} voters`, async function() {
      const { votersList, createTx, threshold } = await setupInitialNofMGovernance(numVoters);
      const initialCreateGas = await measureGas(createTx);

      let totalVotingGas = ethers.getBigInt(0);
      let votesCount = 2;

      for (const voter of votersList) {
        if (votesCount < threshold) {
          const isApproved = await nofmGov.isApproved(0);
          if (!isApproved) {
            const voteTx = await nofmGov.connect(voter).vote(0, votesCount);
            const voteGas = await measureGas(voteTx);
            totalVotingGas += voteGas;
            votesCount++;
          } else {
            break;
          }
        }
      }

      const newProposalTx = await createNewProposal({
        methodName: "NofM",
        controllers: [owner.address, controller1.address, ...votersList.map(v => v.address)],
        contractAddres: nofmGov.target,
        contractPublicKey: "publicKey123",
        intArgs: [Math.floor(numVoters / 2) + 1],
        stringArgs: [],
        boolArgs: [],
        governanceMethodType: 0,
        expiresAt: 0,
        blockedUntil: 0,
        editRightsLevel: 0,
        verifierContracts: [],
        issuers: []
      });
      const newProposalGas = await measureGas(newProposalTx);

      results.NofM[votesCount] = {
        initialCreateGas: initialCreateGas.toString(),
        averageVoteGas: (totalVotingGas / BigInt(votesCount)).toString(),
        totalVotingGas: totalVotingGas.toString(),
        newProposalGas: newProposalGas.toString(),
        totalProcessGas: (initialCreateGas + totalVotingGas + newProposalGas).toString()
      };
    });

    it(`Measure TimeLimited governance process gas costs with ${numVoters} voters`, async function() {
      const { votersList, createTx } = await setupInitialTimeLimitedGovernance(numVoters);
      const initialCreateGas = await measureGas(createTx);

      let totalVotingGas = ethers.getBigInt(0);
      let votesCount = 0;

      for (const voter of votersList) {
        const isApproved = await timeLimitedGov.isApproved(0);
        if (!isApproved) {
          const voteTx = await timeLimitedGov.connect(voter).vote(0, true);
          const voteGas = await measureGas(voteTx);
          totalVotingGas += voteGas;
          votesCount++;
        } else {
          break;
        }
      }

      const newProposalTx = await createNewProposal({
        methodName: "TimeLimited",
        controllers: [owner.address, controller1.address, ...votersList.map(v => v.address)],
        contractAddres: timeLimitedGov.target,
        contractPublicKey: "publicKey123",
        intArgs: [3600],
        stringArgs: [],
        boolArgs: [],
        governanceMethodType: 0,
        expiresAt: 0,
        blockedUntil: 0,
        editRightsLevel: 0,
        verifierContracts: [],
        issuers: []
      });
      const newProposalGas = await measureGas(newProposalTx);

      results.TimeLimited[votesCount] = {
        initialCreateGas: initialCreateGas.toString(),
        averageVoteGas: (totalVotingGas / BigInt(votesCount)).toString(),
        totalVotingGas: totalVotingGas.toString(),
        newProposalGas: newProposalGas.toString(),
        totalProcessGas: (initialCreateGas + totalVotingGas + newProposalGas).toString()
      };
    });

  }

  for (const numVoters of numberofIndependent) {
    it(`Measure Independent governance process gas costs with ${numVoters} controllers`, async function() {
      const { votersList, createTx } = await setupInitialIndependentGovernance(numVoters);
      const initialCreateGas = await measureGas(createTx);

      const newProposalTx = await createNewProposal({
        methodName: "IndependentVoting",
        controllers: [owner.address, controller1.address, ...votersList.map(v => v.address)],
        contractAddres: independentgov.target,
        contractPublicKey: "publicKey123",
        intArgs: [],
        stringArgs: [],
        boolArgs: [],
        governanceMethodType: 0,
        expiresAt: 0,
        blockedUntil: 0,
        editRightsLevel: 0,
        verifierContracts: [],
        issuers: []
      });
      const newProposalGas = await measureGas(newProposalTx);

      results.Independent[numVoters] = {
        initialCreateGas: initialCreateGas.toString(),
        newProposalGas: newProposalGas.toString(),
        totalProcessGas: (initialCreateGas + newProposalGas).toString()
      };
    });
  }

  after(function() {
    const fs = require('fs');
    const path = require('path');
    console.log("TEST_RESULTS=" + JSON.stringify(results, null, 2));

    // Save results to JSON file
    const resultsPath = path.join(__dirname, 'test_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  });
});
