
const { expect } = require("chai");
const { Log } = require("ethers");
const { ethers } = require("hardhat");

describe("NofMGovernance", function() {
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

    // Deploy CounterLogicGovernance contract
    CounterLogicGovernance = await ethers.getContractFactory("NofMGovernance");
    governance = await CounterLogicGovernance.deploy(
      didRegistry.target
    );
    await governance.waitForDeployment();


  });


  it("Create and update DID Document with 3 out of 5 votes", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const simpleGovMethod = {
      methodName: "first method",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "dddd",
      intArgs: [9],
      stringArgs: ["xd"],
      boolArgs: [false],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    }
    const controlersAdresses = [controller1.address, controller2.address, controller3.address, controller4.address, controller5.address]
    const simpleGovMethod2 = {
      methodName: "3 of 5 governance",
      controllers: controlersAdresses,
      contractAddres: governance.target,
      contractPublicKey: "dddd",
      intArgs: [3], //  first arg specifies the threshold
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0


    }

    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [simpleGovMethod, simpleGovMethod2]);

    const did = await didRegistry.didDocuments(owner.address);
    // console.log("Did:")
    // console.log(did)
    expect(did.owner).to.equal(owner.address);
    expect(did.publicKey).to.equal(publicKey);
    expect(did.authenticationMethod).to.equal(authenticationMethod);


    // const didGovernanceMethods = await didRegistry.getGovernanceMethods(did.owner)
    // console.log(didGovernanceMethods)
    // console.log(didGovernanceMethods[1].controllers)
    // console.log(controlersAdresses)
    // idk why this does not work 
    // expect(Array(didGovernanceMethods[1].controllers)).to.equal(controlersAdresses);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() // setting the lastChanged before calling the create proposal might couse probles. LastChanged should be set somehow from inside of the contract or maybe get removed

    };



    await didRegistryRouter.connect(controller5).createProposalWithControllers(
      owner.address, // DID owner
      1, // caller index in the controllers list
      4, // governance method index in governanceMethods
      newDidDocument,
      [simpleGovMethod2]
    )

    // after 3 votes proposal should be accespted and did overwriten
    await governance.connect(controller2).vote(0, 1)
    await governance.connect(controller1).vote(0, 0)
    await governance.connect(controller3).vote(0, 2)

    const updatedDid = await didRegistry.didDocuments(owner.address)
    expect(updatedDid.owner).to.equal(newDidDocument.owner);
    expect(updatedDid.publicKey).to.equal(newDidDocument.publicKey);
    expect(updatedDid.authenticationMethod).to.equal(newDidDocument.authenticationMethod);


  });
  // TODO: create more tests

});
