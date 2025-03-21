
const { expect } = require("chai");
const { Log } = require("ethers");
const { ethers } = require("hardhat");

describe("DIDRegistryRouter", function() {
  let DIDRegistry, CounterLogicGovernance, didRegistry, governance;
  let owner, controller1, controller2, controller3, other;
  function hashCredentials(strings, numbers, bools, addresses) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string[]", "uint256[]", "bool[]", "address[]"],
      [strings, numbers, bools, addresses]
    );
    return ethers.keccak256(encoded)
  }

  function hashToken(token) {
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
  beforeEach(async function() {

    [owner, controller1, controller2, controller3, issuer1, other] = await ethers.getSigners();

    Credentials = await ethers.getContractFactory("Credentials");
    credentials = await Credentials.deploy(
    );
    await credentials.waitForDeployment();
    // Deploy DIDRegistry contract
    DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy();
    await didRegistry.waitForDeployment();

    DIDRegistryRouter = await ethers.getContractFactory("DIDRegistryRouter");
    didRegistryRouter = await DIDRegistryRouter.deploy(
      didRegistry.target,
      credentials.target
    );
    await didRegistryRouter.waitForDeployment();

    didRegistry.setDIDRegistryRouterAddress(didRegistryRouter.target)


    // Deploy WheightedMajorityGovernance contract
    WeightedMajorityGovernance = await ethers.getContractFactory("WeightedMajorityGovernance");
    governance = await WeightedMajorityGovernance.deploy(
      didRegistry.target,
      credentials.target
    );
    await governance.waitForDeployment();

    AgeVerifier = await ethers.getContractFactory("AgeVerifier");
    ageVerifier = await AgeVerifier.deploy(
      didRegistryRouter.target,
      credentials.target
    );
    await ageVerifier.waitForDeployment();


  });

  it("Create a Proposal with VC via verifierContracts", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const simpleGovMethod = {
      methodName: "WheightedMajorityGovernance with VC",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "dddd",
      intArgs: [9, 2],
      stringArgs: ["xd"],
      boolArgs: [false],
      governanceMethodType: 3, // VC governanceMethodType
      verifierContracts: [ageVerifier.target],
      issuers: [issuer1.address],
      expiresAt: 0, blockedUntil: 0, editRightsLevel: 0

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
    await didRegistry.connect(controller1).createDIDDocument(publicKey, authenticationMethod, [simpleGovMethod]);

    const strArr = ["Mario"];
    const numArr = [22];
    const boolArr = [true];
    const addrArr = [controller1.address];
    const jsHash = hashCredentials(strArr, numArr, boolArr, addrArr);
    const signature = await issuer1.signMessage(ethers.toBeArray(jsHash))

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: 2222 // setting the lastChanged before calling the create proposal might couse probles. LastChanged should be set somehow from inside of the contract or maybe get removed

    };

    await ageVerifier.connect(controller1).createProposal(
      controller1.address,
      0,
      newDidDocument,
      [simpleGovMethod],
      // credentials 
      strArr,
      numArr,
      boolArr,
      addrArr,
      signature,
      issuer1.address, // credentials issuer address
      0 // index of the ageVerifer in simpleGovMethod
    );

    const proposal = await didRegistry.getProposal(controller1.address, 0);
    expect(proposal.newDidDocument.publicKey).to.equal(newDidDocument.publicKey);
    expect(proposal.newDidDocument.owner).to.equal(newDidDocument.owner);

  });
  it("Create a Proposal with Token", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const simpleGovMethod = {
      methodName: "WheightedMajorityGovernance with VC",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "dddd",
      intArgs: [9, 2],
      stringArgs: ["xd"],
      boolArgs: [false],
      governanceMethodType: 1, // Token governanceMethodType
      verifierContracts: [ageVerifier.target],
      issuers: [issuer1.address],
      expiresAt: 0, blockedUntil: 0, editRightsLevel: 0

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
    await didRegistry.connect(controller1).createDIDDocument(publicKey, authenticationMethod, [simpleGovMethod]);

    const token = "sometoken"
    const tokenHash = hashToken(token)
    const signature = await issuer1.signMessage(ethers.toBeArray(tokenHash))

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: 2222 // setting the lastChanged before calling the create proposal might couse probles. LastChanged should be set somehow from inside of the contract or maybe get removed

    };

    await didRegistryRouter.connect(controller1).createProposalWithToken(
      controller1.address,
      0,
      newDidDocument,
      [simpleGovMethod],
      // credentials 
      0, // issuer index
      token,
      signature

    );

    const proposal = await didRegistry.getProposal(controller1.address, 0);
    expect(proposal.newDidDocument.publicKey).to.equal(newDidDocument.publicKey);
    expect(proposal.newDidDocument.owner).to.equal(newDidDocument.owner);

  });

  it("Create a Proposal with TokenHolder", async function() {
    const publicKey = "publicKey1"
    const authenticationMethod = "authMethod1";
    const simpleGovMethod = {
      methodName: "WheightedMajorityGovernance with VC",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "dddd",
      intArgs: [9, 2],
      stringArgs: ["xd"],
      boolArgs: [false],
      governanceMethodType: 2, // TokenHolder governanceMethodType
      verifierContracts: [ageVerifier.target],
      issuers: [issuer1.address],
      expiresAt: 0, blockedUntil: 0, editRightsLevel: 0

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
    await didRegistry.connect(controller1).createDIDDocument(publicKey, authenticationMethod, [simpleGovMethod]);

    const token = controller1.address
    const tokenHash = hashAddressToken(token)
    const signature = await issuer1.signMessage(ethers.toBeArray(tokenHash))

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: 2222 // setting the lastChanged before calling the create proposal might couse probles. LastChanged should be set somehow from inside of the contract or maybe get removed

    };

    await didRegistryRouter.connect(controller1).createProposalWithTokenHolder(
      controller1.address,
      0,
      newDidDocument,
      [simpleGovMethod],
      // credentials 
      0, // issuer index
      token,
      signature

    );

    const proposal = await didRegistry.getProposal(controller1.address, 0);
    expect(proposal.newDidDocument.publicKey).to.equal(newDidDocument.publicKey);
    expect(proposal.newDidDocument.owner).to.equal(newDidDocument.owner);

  });
});
