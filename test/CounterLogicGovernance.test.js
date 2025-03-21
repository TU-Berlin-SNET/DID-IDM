const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CounterLogicGovernance", function() {
  let DIDRegistry, CounterLogicGovernance, didRegistry, governance;
  let owner, controller1, controller2, controller3, other;

  beforeEach(async function() {

    [owner, controller1, controller2, controller3, other] = await ethers.getSigners();

    // Deploy DIDRegistry contract
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


    // Deploy CounterLogicGovernance contract
    CounterLogicGovernance = await ethers.getContractFactory("CounterLogicGovernance");
    governance = await CounterLogicGovernance.deploy(didRegistry.target);
    await governance.waitForDeployment();

    //console.log("CounterLogicGovernance deployed to:", governance.target);
  });

  //
  //
  it("Allow controllers to vote on a proposal", async function() {

    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2, 2],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, issuers: [], verifierContracts: [], governanceMethodType: 0, editRightsLevel: 0
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
    expect(did.publicKey).to.equal("newPublicKey"); //should be changed, but are not. the general logic has been changed, so this needs some investigation
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
      intArgs: [2, 2],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, issuers: [], verifierContracts: [], governanceMethodType: 0, editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() + 1 //plus one for realism

    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(owner.address, 0, 0, newDidDocument, []);

    await governance.connect(controller1).vote(0, true);
    await governance.connect(controller2).vote(0, true);

    // Execute the proposal
    const statusOfVote = await governance.isApproved(0);
    const newDid = await didRegistry.didDocuments(owner.address);
    // console.log(newDid);
    expect(statusOfVote).to.equal(true);
    // console.log("Owner Address:", owner.address);
    // console.log("Did Registry Address:", didRegistry.target);
    // console.log("Governance Address:", governance.target);
    // console.log("Status:", statusOfVote);




    expect(newDid.publicKey).to.equal("newPublicKey"); //should be changed, but are not. the general logic has been changed, so this needs some investigation
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
      intArgs: [2, 2],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, issuers: [], verifierContracts: [], governanceMethodType: 0, editRightsLevel: 0
    };

    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newPublicKey = "newPublicKey";
    const newAuthenticationMethod = "newAuthMethod";
    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() // setting the lastChanged before calling the create proposal might couse probles. LastChanged should be set somehow from inside of the contract or maybe get removed

    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address,
      //controller1.address,
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument, //
      [governanceMethod]// passing alod governance method
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
      intArgs: [2, 2],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, issuers: [], verifierContracts: [], governanceMethodType: 0, editRightsLevel: 0
    };


    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newPublicKey = "newPublicKey";
    const newAuthenticationMethod = "newAuthMethod";
    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() + 1 //plus one for realism

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

  it("Required votes should not be higher than controller count", async function() {

    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [4, 1], // 60 seconds = 1 minute
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, issuers: [], verifierContracts: [], governanceMethodType: 0, editRightsLevel: 0
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
    ).to.be.revertedWith("Required number of votes is higher than the number of controllers!");
  });
});
