const { expect } = require("chai");
const { Log } = require("ethers");
const { ethers } = require("hardhat");

describe("DIDRegistry", function() {
  let DIDRegistry, CounterLogicGovernance, didRegistry, governance;
  let owner, controller1, controller2, controller3, other;

  beforeEach(async function() {

    [owner, controller1, controller2, controller3, other] = await ethers.getSigners();

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
    CounterLogicGovernance = await ethers.getContractFactory("NofMGovernance");
    governance = await CounterLogicGovernance.deploy(
      didRegistry.target
    );
    await governance.waitForDeployment();


  });

  it("Create a DID Document", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const simpleGovMethod = {
      methodName: "firstMethod",
      controllers: [controller1.address, controller2.address],
      contractAddres: owner.address,
      contractPublicKey: "dddd",
      intArgs: [9],
      stringArgs: ["xd"],
      boolArgs: [false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0

    }
    const simpleGovMethod2 = {
      methodName: "secondMethod",
      controllers: [controller1.address, controller2.address],
      contractAddres: owner.address,
      contractPublicKey: "dddd",
      intArgs: [9],
      stringArgs: ["xd"],
      boolArgs: [false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    }

    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [simpleGovMethod, simpleGovMethod2]);

    const did = await didRegistry.didDocuments(owner.address);
    // console.log("Did:")
    // console.log(did)
    expect(did.owner).to.equal(owner.address);
    expect(did.publicKey).to.equal(publicKey);
    expect(did.authenticationMethod).to.equal(authenticationMethod);

    // const didGovernanceMethods = await didRegistry.getGovernanceMethods(owner.address)
    // console.log("Did Governance method")
    // console.log(didGovernanceMethods)

  });


  it("Debug onlyController modifier", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";

    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address,],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [1],
      stringArgs: ["arg1"],
      boolArgs: [false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const governanceMethodIndex = 0;
    const callerIndex = 0;


    // get expected controller
    const expectedController = await didRegistry.getController(
      owner.address,
      governanceMethodIndex,
      callerIndex
    );

    expect(expectedController).to.equal(controller1.address); // controller is correct
  });
  //
  //
  it("Propose update to the DID Document", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [1, 2],
      stringArgs: ["arg1", "arg2"],
      boolArgs: [true, false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    // Create the DID Document
    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);
    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() // setting the lastChanged before calling the create proposal might couse probles. LastChanged should be set somehow from inside of the contract or maybe get removed

    };

    const newGovernanceMethods = [
      {
        methodName: "NewSimpleVotin1",
        controllers: [controller1.address, controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
      },
      {
        methodName: "NewSimpleVoting2",
        controllers: [controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
      },
    ]




    // Propose the update
    await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address, // DID owner
      // controller1.address, // Caller address, changed from owner.address since they are seperate entities
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      newGovernanceMethods
    );



    // to verify the proposal
    const proposalCount = await didRegistry.getProposalCount(owner.address);

    if (proposalCount > 0) {
      const proposal = await didRegistry.proposals(owner.address, 0); // this gets the first proposal
      expect(proposal.did).to.equal(owner.address);
      expect(proposal.newDidDocument.publicKey).to.equal("newPublicKey");
      expect(proposal.status).to.equal(0); // Pending?
    } else {
      throw new Error("No proposals found for this DID!");
    }
  });
  it("Propose and resolve update of the DID Document", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [1, 2],
      stringArgs: ["arg1", "arg2"],
      boolArgs: [true, false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    // Create the DID Document
    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);
    // console.log(controller1.address);
    // console.log(controller2.address);
    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() // setting the lastChanged before calling the create proposal might couse probles. LastChanged should be set somehow from inside of the contract or maybe get removed

    };

    const newGovernanceMethods = [
      {
        methodName: "NewSimpleVotin1",
        controllers: [controller1.address, controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
      },
      {
        methodName: "NewSimpleVoting2",
        controllers: [controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
      },
    ]




    // Propose the update
    await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address, // DID owner
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      newGovernanceMethods
    );

    // calling the NofMGovernance contract and casting an vote
    // as the threshold was set to 1 this should resolve governanceProcess
    await governance.connect(controller1).vote(0, 0)

    const updatedDid = await didRegistry.didDocuments(owner.address)
    expect(updatedDid.owner).to.equal(newDidDocument.owner);
    expect(updatedDid.publicKey).to.equal(newDidDocument.publicKey);
    expect(updatedDid.authenticationMethod).to.equal(newDidDocument.authenticationMethod);


  })
  it("Should falle to update EditRightsLevel from SelfGovern to All", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [1, 2],
      stringArgs: ["arg1", "arg2"],
      boolArgs: [true, false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 2
    };

    // Create the DID Document
    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);
    // console.log(controller1.address);
    // console.log(controller2.address);
    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() // setting the lastChanged before calling the create proposal might couse probles. LastChanged should be set somehow from inside of the contract or maybe get removed

    };

    const newGovernanceMethods = [
      {
        methodName: "NewSimpleVotin1",
        controllers: [controller1.address, controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
      }
    ]
    // Propose the update
    await expect(didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address, // DID owner
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      newGovernanceMethods
    )).to.be.revertedWith("You can not change the EditRightsLevel if you have EditRightsLevel==SeflGovernance");



  })
  it("Should fale to use governanceMethod that expired", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const expiresAt = await ethers.provider.getBlock().then(block => block.timestamp) + 2000 // adding to curent block.timestamp 2000 seconds
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [1, 2],
      stringArgs: ["arg1", "arg2"],
      boolArgs: [true, false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: expiresAt, blockedUntil: 0, editRightsLevel: 1
    };

    // Create the DID Document
    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);



    const newGovernanceMethods = [
      {
        methodName: "NewSimpleVotin1",
        controllers: [controller1.address, controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 1
      }
    ]
    await ethers.provider.send("evm_increaseTime", [2001]) // simmulate passing of 2001 seconds
    await ethers.provider.send("evm_mine", []) // force mine the next block
    // console.log(await ethers.provider.getBlock().then(block => block.timestamp))

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    await expect(didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address, // DID owner
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      newGovernanceMethods
    )).to.be.revertedWith("This governanceMethod already expired");




  })
  it("Should be able to use governanceMethod that did not expired yet", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const expiresAt = await ethers.provider.getBlock().then(block => block.timestamp) + 2000 // adding to curent block.timestamp 2000 seconds
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [1, 2],
      stringArgs: ["arg1", "arg2"],
      boolArgs: [true, false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: expiresAt, blockedUntil: 0, editRightsLevel: 1
    };

    // Create the DID Document
    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);



    const newGovernanceMethods = [
      {
        methodName: "NewSimpleVotin1",
        controllers: [controller1.address, controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 1
      }
    ]
    await ethers.provider.send("evm_increaseTime", [1000]) // simmulate passing of 1000 seconds
    await ethers.provider.send("evm_mine", []) // force mine the next block

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address, // DID owner
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      newGovernanceMethods
    )
    await governance.connect(controller1).vote(0, 0)

    // console.log(await ethers.provider.getBlock().then(block => block.timestamp))
    const updatedDid = await didRegistry.didDocuments(owner.address)
    expect(updatedDid.owner).to.equal(newDidDocument.owner);
    expect(updatedDid.publicKey).to.equal(newDidDocument.publicKey);
    expect(updatedDid.authenticationMethod).to.equal(newDidDocument.authenticationMethod);


  })
  it("Should fail to use time blocked governanceMethod", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const blockedUntil = await ethers.provider.getBlock().then(block => block.timestamp) + 2000 // adding to curent block.timestamp 2000 seconds
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [1, 2],
      stringArgs: ["arg1", "arg2"],
      boolArgs: [true, false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: blockedUntil, editRightsLevel: 1
    };

    // Create the DID Document
    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);



    const newGovernanceMethods = [
      {
        methodName: "NewSimpleVotin1",
        controllers: [controller1.address, controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 1
      }
    ]

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };


    // Propose the update
    await expect(didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address, // DID owner
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      newGovernanceMethods
    )).to.be.revertedWith("This governanceMethod is still Blocked until certain timestamp");


  })
  it("Should be able to use governanceMethod passed the blockedUntil timestamp", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const blockedUntil = await ethers.provider.getBlock().then(block => block.timestamp) + 2000 // adding to curent block.timestamp 2000 seconds
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [1, 2],
      stringArgs: ["arg1", "arg2"],
      boolArgs: [true, false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: blockedUntil, editRightsLevel: 1
    };

    // Create the DID Document
    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);



    const newGovernanceMethods = [
      {
        methodName: "NewSimpleVotin1",
        controllers: [controller1.address, controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 1
      }
    ]

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };


    // Proposal should be reverted as the blockedUntil did not enlapsed yet  
    await expect(didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address, // DID owner
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      newGovernanceMethods
    )).to.be.revertedWith("This governanceMethod is still Blocked until certain timestamp");

    await ethers.provider.send("evm_increaseTime", [2000]) // simmulate passing of 2000 seconds to make sure that methods was unlocked
    await ethers.provider.send("evm_mine", []) // force mine the next block
    await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address, // DID owner
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      newGovernanceMethods
    )
    await governance.connect(controller1).vote(0, 0)

    // console.log(await ethers.provider.getBlock().then(block => block.timestamp))
    const updatedDid = await didRegistry.didDocuments(owner.address)
    expect(updatedDid.owner).to.equal(newDidDocument.owner);
    expect(updatedDid.publicKey).to.equal(newDidDocument.publicKey);
    expect(updatedDid.authenticationMethod).to.equal(newDidDocument.authenticationMethod);
  })

  it("GovMethods with editRightsLevel==CreateDelegates hould be able to append new GovMethods", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [1, 2],
      stringArgs: ["arg1", "arg2"],
      boolArgs: [true, false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 1
    };

    // Create the DID Document
    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod, governanceMethod]);



    const delegatesGovmethods = [
      {
        methodName: "Delegate1",
        controllers: [controller1.address, controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 3
      },
      {
        methodName: "Delegate2",
        controllers: [controller1.address, controller2.address,],
        contractAddres: governance.target,
        contractPublicKey: "publicKey123",
        intArgs: [1],
        stringArgs: ["arg1"],
        boolArgs: [true],
        governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 3
      }
    ]

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber()
    };


    await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address, // DID owner
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      [governanceMethod, ...delegatesGovmethods]

    )
    await governance.connect(controller1).vote(0, 0)

    const updatedDid = await didRegistry.didDocuments(owner.address)
    expect(updatedDid.owner).to.equal(newDidDocument.owner);
    expect(updatedDid.publicKey).to.equal(newDidDocument.publicKey);
    expect(updatedDid.authenticationMethod).to.equal(newDidDocument.authenticationMethod);
    const updateGovMethods = await didRegistry.getGovernanceMethods(owner.address)
    // as we use GovMethod with DelegateCreation rights an outcome of the proposalResolvent should be appending fo delegatesGovMethods to the governanceMethods for the did
    expect(updateGovMethods[0].methodName).to.equal(governanceMethod.methodName);
    expect(updateGovMethods[1].methodName).to.equal(governanceMethod.methodName);
    expect(updateGovMethods[2].methodName).to.equal(delegatesGovmethods[0].methodName);
    expect(updateGovMethods[3].methodName).to.equal(delegatesGovmethods[1].methodName);
  })
});
