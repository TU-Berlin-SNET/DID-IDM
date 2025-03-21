const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TimeLimitedGovernance", function() {
  let DIDRegistry, CounterLogicGovernance, didRegistry, governance;
  let owner, controller1, controller2, controller3, controller4, controller5, other;

  beforeEach(async function() {

    [owner, controller1, controller2, controller3, controller4, controller5, other] = await ethers.getSigners();

    Credentials = await ethers.getContractFactory("Credentials");
    credentials = await Credentials.deploy(
    );
    await credentials.waitForDeployment();
    // Deploy DIDRegistry contract
    DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy();
    await didRegistry.waitForDeployment();

    Credentials = await ethers.getContractFactory("Credentials");
    credentials = await Credentials.deploy();
    await credentials.waitForDeployment();

    DIDRegistryRouter = await ethers.getContractFactory("DIDRegistryRouter");
    didRegistryRouter = await DIDRegistryRouter.deploy(
      didRegistry.target,
      credentials.target
    );
    await didRegistryRouter.waitForDeployment();

    didRegistry.setDIDRegistryRouterAddress(didRegistryRouter.target)


    TimeLimitedGovernance = await ethers.getContractFactory("TimeLimitedGovernance");
    governance = await TimeLimitedGovernance.deploy(didRegistry.target
    );
    await governance.waitForDeployment();

  });

  it("Allow controllers to vote on a proposal", async function() {

    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [600],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()


    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(owner.address, 0, 0, newDidDocument, []);

    await governance.connect(controller1).vote(0, true);
    await governance.connect(controller2).vote(0, true);

    const proposal = await governance.governanceProcesses(0);

    expect(proposal.yesVotes).to.equal(2);
    expect(proposal.noVotes).to.equal(0);
    const did = await didRegistry.didDocuments(owner.address);
    expect(did.publicKey).to.equal("newPublicKey");
    expect(did.authenticationMethod).to.equal("newAuthMethod");
  });

  it("Execute the proposal when the required votes are met", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";

    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [600],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() + 1

    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(owner.address, 0, 0, newDidDocument, []);

    await governance.connect(controller1).vote(0, true);
    await governance.connect(controller2).vote(0, true);

    // Execute the proposal
    const statusOfVote = await governance.isApproved(0);
    const newDid = await didRegistry.didDocuments(owner.address);
    // console.log(newDid);
    expect(statusOfVote).to.equal(true);





    expect(newDid.publicKey).to.equal("newPublicKey");
    expect(newDid.authenticationMethod).to.equal("newAuthMethod");
  });

  it("Should not allow non-controllers to vote on a proposal", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address,],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [600],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newPublicKey = "newPublicKey";
    const newAuthenticationMethod = "newAuthMethod";
    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()

    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address,
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      [governanceMethod]// passing along governance method
    );

    // non-controller trying to vote
    await expect(governance.connect(other).vote(0, true)).to.be.revertedWith(
      "Only controllers can vote"
    );
  });

  it("Should not execute a proposal with insufficient votes", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address,],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [600],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };


    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newPublicKey = "newPublicKey";
    const newAuthenticationMethod = "newAuthMethod";
    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() + 1

    };


    await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address,
      0,
      0,
      newDidDocument,
      [governanceMethod]
    );

    // only one controller votes, needed 2 votes
    await governance.connect(controller1).vote(0, true);

    // Attempt to approve the proposal
    const statusOfVote = await governance.isApproved(0);
    expect(statusOfVote).to.equal(false);
  });

  it("Should not allow controllers to vote if the voting period has ended", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [600], // 600 seconds = 10 minutes
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() + 1
    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(owner.address, 0, 0, newDidDocument, []);

    // Move forward in time to exceed the voting period
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60]); // 3 days
    await ethers.provider.send("evm_mine");

    // Attempt to vote after the voting period has ended
    await expect(governance.connect(controller1).vote(0, true)).to.be.revertedWith("Voting period has ended");
  });

  it("Should accept the proposal if it has more yes votes after the voting period has ended", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address, controller4.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [600],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() + 1
    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(owner.address, 0, 0, newDidDocument, []);

    await governance.connect(controller1).vote(0, true);
    await governance.connect(controller2).vote(0, true);


    await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");
    await governance.finalizeProposal(0);



    const statusOfVote = await governance.isApproved(0);
    expect(statusOfVote).to.equal(true);

    const did = await didRegistry.didDocuments(owner.address);
    expect(did.publicKey).to.equal("newPublicKey");
    expect(did.authenticationMethod).to.equal("newAuthMethod");
  });

  it("Should reject the proposal if it has more no votes after the voting period has ended", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address, controller4.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [600],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() + 1
    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(owner.address, 0, 0, newDidDocument, []);

    await governance.connect(controller1).vote(0, false);
    await governance.connect(controller2).vote(0, false);
    await governance.connect(controller3).vote(0, true);


    await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");
    await governance.finalizeProposal(0);

    const statusOfVote = await governance.isApproved(0);
    expect(statusOfVote).to.equal(false);

    const did = await didRegistry.didDocuments(owner.address);
    expect(did.publicKey).to.equal("publicKey1");
    expect(did.authenticationMethod).to.equal("authMethod1");
  });

  it("Voting Period should not be shorter than 5 minutes", async function() {

    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [60], // 60 seconds = 1 minute
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()


    };

    await expect(
      didRegistryRouter.connect(controller1).createProposalWithControllers(
        owner.address,
        0,
        0,
        newDidDocument,
        [governanceMethod]
      )
    ).to.be.revertedWith("Voting Period Cannot be less than 5 minutes!");
  });

  it("Check Upkeep functions properly", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [600], // 600 seconds = 10 minutes
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(owner.address, 0, 0, newDidDocument, []);

    // Exceeding the proposal period
    await ethers.provider.send("evm_increaseTime", [900]); // 15 minutes
    await ethers.provider.send("evm_mine");

    // Call checkUpkeep, Chainlink is calling this
    const [upkeepNeeded, performData] = await governance.checkUpkeep("0x");

    // Verify the upkeep results
    expect(upkeepNeeded).to.equal(true);

    // Decode performData
    const abiCoder = new ethers.AbiCoder();
    const decodedData = abiCoder.decode(["uint256"], performData);
    expect(decodedData[0]).to.equal(0);
  });

  it("Perform Upkeep functions properly", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address, controller4.address, controller5.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [600],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(owner.address, 0, 0, newDidDocument, []);

    await governance.connect(controller1).vote(0, true);
    await governance.connect(controller2).vote(0, true);

    await ethers.provider.send("evm_increaseTime", [900]);
    await ethers.provider.send("evm_mine");

    // Perform upkeep
    const abiCoder = new ethers.AbiCoder();
    const performData = abiCoder.encode(["uint256"], [0]); // Encode proposalId
    await governance.performUpkeep(performData);

    const statusOfVote = await governance.isApproved(0);
    expect(statusOfVote).to.equal(true);

    const did = await didRegistry.didDocuments(owner.address);
    expect(did.publicKey).to.equal("newPublicKey");
    expect(did.authenticationMethod).to.equal("newAuthMethod");
  });

});
