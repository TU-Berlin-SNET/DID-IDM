
const { expect } = require("chai");
const { Log } = require("ethers");
const { ethers } = require("hardhat");

describe("IndependentGovernance", function() {
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
    CounterLogicGovernance = await ethers.getContractFactory("IndependentGovernance");
    governance = await CounterLogicGovernance.deploy(
      didRegistry.target
    );
    await governance.waitForDeployment();
  });

  it("Create and update DID Document with just 1 controller", async function() {
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
    const controlersAdresses = [controller1.address, controller2.address, controller3.address,]
    const simpleGovMethod2 = {
      methodName: "IndependentGovernance method",
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
    expect(did.owner).to.equal(owner.address);
    expect(did.publicKey).to.equal(publicKey);
    expect(did.authenticationMethod).to.equal(authenticationMethod);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() // setting the lastChanged before calling the create proposal might couse probles. LastChanged should be set somehow from inside of the contract or maybe get removed

    };


    // in this case no vote casting is needed as all valid proposals with IndepenentGovernance method get automaticly resolved
    await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address, // DID owner
      1, // governance method index in governanceMethods
      0, // caller index in the controllers list
      newDidDocument,
      [simpleGovMethod2]
    )


    const updatedDid = await didRegistry.didDocuments(owner.address)
    expect(updatedDid.owner).to.equal(newDidDocument.owner);
    expect(updatedDid.publicKey).to.equal(newDidDocument.publicKey);
    expect(updatedDid.authenticationMethod).to.equal(newDidDocument.authenticationMethod);


  });
  // TODO: Write tests 

});
