const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OffChainGovernanceController", function () {
  let DIDRegistry, OffChainGovernanceController, Credentials;
  let didRegistry, governance, credentials;
  let owner, controller1, controller2, controller3, controller4, controller5, controller6, controller7, other;

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

  beforeEach(async function () {
    //[owner, controller1, controller2, controller3, other] = await ethers.getSigners();
    [owner, controller1, controller2, controller3, controller4, controller5, controller6, controller7, other] = await ethers.getSigners();

    Credentials = await ethers.getContractFactory("Credentials");
    credentials = await Credentials.deploy();
    await credentials.waitForDeployment();

    DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy();
    await didRegistry.waitForDeployment();

    DIDRegistryRouter = await ethers.getContractFactory("DIDRegistryRouter");
    didRegistryRouter = await DIDRegistryRouter.deploy(didRegistry.target, credentials.target);
    await didRegistryRouter.waitForDeployment();

    await didRegistry.setDIDRegistryRouterAddress(didRegistryRouter.target);

    OffChainGovernanceController = await ethers.getContractFactory("OffChainGovernanceController");
    governance = await OffChainGovernanceController.deploy(credentials.target, didRegistry.target);
    await governance.waitForDeployment();
  });

  it("Should allow valid votes to be submitted", async function () {
    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [controller1.address, controller2.address, controller3.address, controller4.address, controller5.address, controller6.address, controller7.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [7],
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

    const proposalTx = await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address,
      0,
      0,
      newDidDocument,
      [governanceMethod],
    );

    const receipt = await proposalTx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    
    const proposalHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint", "uint", "address", "uint"],
        [0, 0, owner.address, block.timestamp]
      )
    );

    const voteMessageHash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bool"],
        [proposalHash, true]
      )
    );

    const signature1 = await controller1.signMessage(ethers.getBytes(voteMessageHash));
    const signature2 = await controller2.signMessage(ethers.getBytes(voteMessageHash));
    const signature3 = await controller3.signMessage(ethers.getBytes(voteMessageHash));
    const signature4 = await controller4.signMessage(ethers.getBytes(voteMessageHash));
    const signature5 = await controller5.signMessage(ethers.getBytes(voteMessageHash));
    const signature6 = await controller6.signMessage(ethers.getBytes(voteMessageHash));
    const signature7 = await controller7.signMessage(ethers.getBytes(voteMessageHash));

    const { sortedAddresses, sortedSignatures } = sortVoteData(
      [controller1.address, controller2.address, controller3.address, controller4.address, controller5.address, controller6.address, controller7.address],
      [signature1, signature2, signature3, signature4, signature5, signature6, signature7] 
    );

    await expect(
      governance.submitVotes(
        0,
        owner.address,
        sortedAddresses,
        [true, true, true, true, true, true, true],
        sortedSignatures
      )
    ).to.emit(governance, "ProposalResolved")
      .withArgs(0, owner.address, true);

    // Verify final state
    const finalProposal = await governance.proposals(owner.address, 0);
    expect(finalProposal.resolved).to.be.true;
    expect(finalProposal.yesVotes).to.equal(7);
  });

  it("Should not allow non-controllers to vote", async function () {
    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2],
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

    const proposalTx = await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address,
      0,
      0,
      newDidDocument,
      [governanceMethod],
    );

    const receipt = await proposalTx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    const proposalHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint", "uint", "address", "uint"],
        [0, 0, owner.address, block.timestamp]
      )
    );

    const voteMessageHash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bool"],
        [proposalHash, true]
      )
    );

    const signature1 = await controller1.signMessage(ethers.getBytes(voteMessageHash));
    const signature3 = await controller3.signMessage(ethers.getBytes(voteMessageHash));

    const { sortedAddresses, sortedSignatures } = sortVoteData(
      [controller1.address, controller3.address],
      [signature1, signature3]
    );

    await expect(
      governance.submitVotes(
        0,
        owner.address,
        sortedAddresses,
        [true, true],
        sortedSignatures
      )
    ).to.be.revertedWith("Only controllers can vote");
  });

  it("Should not allow controller to vote with invalid signature", async function () {
    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2],
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

    const proposalTx = await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address,
      0,
      0,
      newDidDocument,
      [governanceMethod],
    );

    const receipt = await proposalTx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    const proposalHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint", "uint", "address", "uint"],
        [0, 0, owner.address, block.timestamp]
      )
    );

    const voteMessageHash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bool"],
        [proposalHash, true]
      )
    );

    const signature1 = await controller1.signMessage(ethers.getBytes(voteMessageHash));
    const signature3 = await controller3.signMessage(ethers.getBytes(voteMessageHash));

    const { sortedAddresses, sortedSignatures } = sortVoteData(
      [controller1.address, controller2.address],
      [signature1, signature3]
    );

    await expect(
      governance.submitVotes(
        0,
        owner.address,
        sortedAddresses,
        [true, true],
        sortedSignatures
      )
    ).to.be.revertedWith("Invalid signature");
  });

  it("Should resolve a proposal when required votes are met", async function () {
    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2],
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

    const proposalTx = await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address,
      0,
      0,
      newDidDocument,
      [governanceMethod],
    );

    const receipt = await proposalTx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    const proposalHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint", "uint", "address", "uint"],
        [0, 0, owner.address, block.timestamp]
      )
    );

    const voteMessageHash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bool"],
        [proposalHash, true]
      )
    );

    const signature1 = await controller1.signMessage(ethers.getBytes(voteMessageHash));
    const signature2 = await controller2.signMessage(ethers.getBytes(voteMessageHash));

    const { sortedAddresses, sortedSignatures } = sortVoteData(
      [controller1.address, controller2.address],
      [signature1, signature2]
    );

    await expect(
      governance.submitVotes(
        0,
        owner.address,
        sortedAddresses,
        [true, true],
        sortedSignatures
      )
    ).to.emit(governance, "ProposalResolved")
      .withArgs(0, owner.address, true);
  });
  it("Should allow valid votes to be submitted", async function () {
    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [controller1.address, controller2.address, controller3.address, controller4.address, controller5.address, controller6.address, controller7.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [7],
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

    const proposalTx = await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address,
      0,
      0,
      newDidDocument,
      [governanceMethod],
    );

    const receipt = await proposalTx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    
    const proposalHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint", "uint", "address", "uint"],
        [0, 0, owner.address, block.timestamp]
      )
    );

    const voteMessageHash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bool"],
        [proposalHash, true]
      )
    );

    const signature1 = await controller1.signMessage(ethers.getBytes(voteMessageHash));
    const signature2 = await controller2.signMessage(ethers.getBytes(voteMessageHash));
    const signature3 = await controller3.signMessage(ethers.getBytes(voteMessageHash));
    const signature4 = await controller4.signMessage(ethers.getBytes(voteMessageHash));
    const signature5 = await controller5.signMessage(ethers.getBytes(voteMessageHash));
    const signature6 = await controller6.signMessage(ethers.getBytes(voteMessageHash));
    const signature7 = await controller7.signMessage(ethers.getBytes(voteMessageHash));

    const { sortedAddresses, sortedSignatures } = sortVoteData(
      [controller1.address, controller2.address, controller3.address, controller4.address, controller5.address, controller6.address, controller7.address],
      [signature1, signature2, signature3, signature4, signature5, signature6, signature7] 
    );

    await expect(
      governance.submitVotes(
        0,
        owner.address,
        sortedAddresses,
        [true, true, true, true, true, true, true],
        sortedSignatures
      )
    ).to.emit(governance, "ProposalResolved")
      .withArgs(0, owner.address, true);

    // Verify final state
    const finalProposal = await governance.proposals(owner.address, 0);
    expect(finalProposal.resolved).to.be.true;
    expect(finalProposal.yesVotes).to.equal(7);
  });
});