const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WeightedMajorityGovernance", function() {
  let DIDRegistry, DIDRegistryRouter, CounterLogicGovernance, didRegistry, governance, didRegistryRouter;
  let owner, controller1, controller2, controller3, other;

  function hashAddressWeightToken(ownerAddress, tokenWeight) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint"],
      [ownerAddress, tokenWeight]
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
  function hashStringToken(token) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
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

    AgeVerifier = await ethers.getContractFactory("AgeVerifier");
    ageVerifier = await AgeVerifier.deploy(
      didRegistryRouter.target,
      credentials.target
    );
    await ageVerifier.waitForDeployment();

    // Deploy CounterLogicGovernance contract
    WeightedMajorityGovernance = await ethers.getContractFactory("WeightedMajorityGovernance");
    governance = await WeightedMajorityGovernance.deploy(
      didRegistry.target,
      credentials.target
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
      intArgs: [3, 2, 3, 5, 5],
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

    await governance.connect(controller1).voteWithController(0, true, 0);
    await governance.connect(controller2).voteWithController(0, true, 1);

    const proposal = await governance.governanceProcesses(0);

    expect(proposal.yesVotes).to.equal(5);
    expect(proposal.noVotes).to.equal(0);
    const did = await didRegistry.didDocuments(owner.address);
    expect(did.publicKey).to.equal("newPublicKey");
    expect(did.authenticationMethod).to.equal("newAuthMethod");
  });

  it("Execute the proposal when the weight is met", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";

    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2, 2, 3, 4, 4],
      stringArgs: [],
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

    await governance.connect(controller1).voteWithController(0, true, 0);
    await governance.connect(controller2).voteWithController(0, true, 1);

    // Execute the proposal
    const statusOfVote = await governance.isApproved(0);
    const newDid = await didRegistry.didDocuments(owner.address);
    // console.log(newDid);
    expect(statusOfVote).to.equal(true);


    expect(newDid.publicKey).to.equal("newPublicKey");
    expect(newDid.authenticationMethod).to.equal("newAuthMethod");
  });
  function hashCredentials(strings, numbers, bools, addresses) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string[]", "uint256[]", "bool[]", "address[]"],
      [strings, numbers, bools, addresses]
    );
    return ethers.keccak256(encoded)
  }

  it("execute proposal when VC voting is done", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const simpleGovMethod = {
      methodName: "WheightedMajorityGovernance with VC",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "dddd",
      intArgs: [25, 25],
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

    await governance.connect(controller1).voteWithVC(
      0, // proposalId
      true,
      strArr,
      numArr,
      boolArr,
      addrArr,
      signature,
      issuer1.address, // credentials issuer address
      0 // index of the issuer  in simpleGovMethod
    );


    const strArr2 = ["Mario"];
    const numArr2 = [22];
    const boolArr2 = [true];
    const addrArr2 = [controller2.address];
    const jsHash2 = hashCredentials(strArr2, numArr2, boolArr2, addrArr2);
    const signature2 = await issuer1.signMessage(ethers.toBeArray(jsHash2))

    await governance.connect(controller2).voteWithVC(
      0, // proposalId
      true, // vote
      strArr2,
      numArr2,
      boolArr2,
      addrArr2,
      signature2,
      issuer1.address, // credentials issuer address
      0 // index of the issuer in simpleGovMethod
    );
    const updatedDid = await didRegistry.didDocuments(controller1.address)
    expect(updatedDid.owner).to.equal(newDidDocument.owner);
    expect(updatedDid.publicKey).to.equal(newDidDocument.publicKey);
    expect(updatedDid.authenticationMethod).to.equal(newDidDocument.authenticationMethod);


  });

  it("execute proposal when TokenHolder voting is done", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const simpleGovMethod = {
      methodName: "WheightedMajorityGovernance with VC",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "dddd",
      intArgs: [25, 25],
      stringArgs: ["xd"],
      boolArgs: [false],
      governanceMethodType: 2, // VC governanceMethodType
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


    const proposalTokenjsHash = hashAddressToken(controller1.address);
    const proposasTokenSignature = await issuer1.signMessage(ethers.toBeArray(proposalTokenjsHash))

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
      // withTokenHolderArgumnets
      0, // issuerIndex
      controller1.address, //controller address  from addressToken
      proposasTokenSignature
    )


    const proposal = await didRegistry.getProposal(controller1.address, 0);
    expect(proposal.newDidDocument.publicKey).to.equal(newDidDocument.publicKey);
    expect(proposal.newDidDocument.owner).to.equal(newDidDocument.owner);


    const jsHash = hashAddressWeightToken(controller1.address, 20);
    const signature = await issuer1.signMessage(ethers.toBeArray(jsHash))

    await governance.connect(controller1).voteWithTokenHolder(
      0, // proposalId
      true,
      // token argumnets 
      20,
      controller1.address,
      signature,
      issuer1.address, // credentials issuer address
      0 // index of the issuer  in simpleGovMethod
    );


    const jsHash2 = hashAddressWeightToken(controller2.address, 20);
    const signature2 = await issuer1.signMessage(ethers.toBeArray(jsHash2))

    await governance.connect(controller2).voteWithTokenHolder(
      0, // proposalId
      true, // vote
      // token arguments
      20,
      controller2.address,
      signature2,
      issuer1.address, // credentials issuer address
      0 // index of the issuer  in simpleGovMethod
    );
    const updatedDid = await didRegistry.didDocuments(controller1.address)
    expect(updatedDid.owner).to.equal(newDidDocument.owner);
    expect(updatedDid.publicKey).to.equal(newDidDocument.publicKey);
    expect(updatedDid.authenticationMethod).to.equal(newDidDocument.authenticationMethod);


  });

  it("execute proposal when Token voting is done", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const simpleGovMethod = {
      methodName: "WheightedMajorityGovernance with VC",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "dddd",
      intArgs: [25, 25],
      stringArgs: ["xd"],
      boolArgs: [false],
      governanceMethodType: 1, // VC governanceMethodType
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


    const proposalTokenjsHash = hashStringToken("access");
    const proposasTokenSignature = await issuer1.signMessage(ethers.toBeArray(proposalTokenjsHash))

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
      // withTokenHolderArgumnets
      0, // issuerIndex
      "access", // stringToken vaule 
      proposasTokenSignature
    )


    const proposal = await didRegistry.getProposal(controller1.address, 0);
    expect(proposal.newDidDocument.publicKey).to.equal(newDidDocument.publicKey);
    expect(proposal.newDidDocument.owner).to.equal(newDidDocument.owner);


    const jsHash = hashAddressWeightToken(controller1.address, 20);
    const signature = await issuer1.signMessage(ethers.toBeArray(jsHash))

    await governance.connect(controller1).voteWithToken(
      0, // proposalId
      true,
      // token argumnets 
      20,
      controller1.address,
      signature,
      issuer1.address, // credentials issuer address
      0 // index of the issuer  in simpleGovMethod
    );


    const jsHash2 = hashAddressWeightToken(controller2.address, 20);
    const signature2 = await issuer1.signMessage(ethers.toBeArray(jsHash2))

    await governance.connect(controller2).voteWithToken(
      0, // proposalId
      true, // vote
      // token arguments
      20,
      controller2.address,
      signature2,
      issuer1.address, // credentials issuer address
      0 // index of the issuer  in simpleGovMethod
    );
    const updatedDid = await didRegistry.didDocuments(controller1.address)
    expect(updatedDid.owner).to.equal(newDidDocument.owner);
    expect(updatedDid.publicKey).to.equal(newDidDocument.publicKey);
    expect(updatedDid.authenticationMethod).to.equal(newDidDocument.authenticationMethod);


  });

  it("Should not allow non-controllers to vote on a proposal", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address,],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2, 2, 4, 4],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };

    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);
    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() // setting the lastChanged before calling the create proposal might couse probles. LastChanged should be set somehow from inside of the contract or maybe get removed

    };

    await didRegistryRouter.connect(controller1).createProposalWithControllers(
      owner.address,
      0, // caller index in the controllers list
      0, // governance method index in governanceMethods
      newDidDocument,
      [governanceMethod]
    );

    // non-controller trying to vote
    await expect(governance.connect(other).voteWithController(0, true, 1)).to.be.revertedWith(
      "address of the caller must be in controllers array"
    );
  });

  it("Should not execute a proposal with insufficient weight", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "SimpleVoting",
      controllers: [controller1.address, controller2.address, controller3.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2, 2, 3, 4, 5],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0
    };


    await didRegistry.createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

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

    //4 yes weight, 9 total
    await governance.connect(controller1).voteWithController(0, true, 0);
    await governance.connect(controller2).voteWithController(0, true, 1);
    // Attempt to approve the proposal
    const statusOfVote = await governance.isApproved(0);
    expect(statusOfVote).to.equal(false);
  });


  //The current structure checks if the existing governance method is valid, not the new one. This might require some attention. We should also disallow initially having a invalid governance method if possible.

  it("Should validate that controllers + 2 and intArgs are of the same length", async function() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";

    const validMethod = {
      methodName: "ValidButCannotChange",
      controllers: [controller1.address, controller2.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2, 2, 4, 4],
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0,
    };


    const invalidGovernanceMethod = {
      methodName: "InvalidButThere",
      controllers: [controller1.address, controller2.address], // 2 controllers
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [3, 2, 1], // 3 weights (mismatch)
      stringArgs: ["arg1"],
      boolArgs: [true],
      governanceMethodType: 0, verifierContracts: [], issuers: [], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0,
    };

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber() + 1
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [invalidGovernanceMethod]);
    const log = await didRegistry.getGovernanceMethods(owner);
    //console.log(log);

    await expect(
      didRegistryRouter.connect(controller1).createProposalWithControllers(
        owner.address,
        0,
        0,
        newDidDocument,
        [validMethod]
      )
    ).to.be.revertedWith("Invalid governance method configuration");
  });
});
