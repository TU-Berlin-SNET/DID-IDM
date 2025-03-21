const { expect } = require("chai");
const { ethers } = require("hardhat");


//changed the submitVotes function calls to fit the refactoring
describe("OffChainGovernanceToken", function () {
  let DIDRegistry, OffChainGovernanceToken, Credentials;
  let didRegistry, governance, credentials;
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



  beforeEach(async function () {
    [owner, controller1, controller2, controller3, other] = await ethers.getSigners();

    Credentials = await ethers.getContractFactory("Credentials");
    credentials = await Credentials.deploy();
    await credentials.waitForDeployment();

    DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy();
    await didRegistry.waitForDeployment();

    DIDRegistryRouter = await ethers.getContractFactory("DIDRegistryRouter");
    didRegistryRouter = await DIDRegistryRouter.deploy(didRegistry.target, credentials.target);
    await didRegistryRouter.waitForDeployment();

    didRegistry.setDIDRegistryRouterAddress(didRegistryRouter.target)

    OffChainGovernanceToken = await ethers.getContractFactory("OffChainGovernanceToken");
    governance = await OffChainGovernanceToken.deploy(credentials.target, didRegistry.target);
    await governance.waitForDeployment();

  

  });


  it("Should allow valid votes to be submitted", async function () {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 1,
      verifierContracts: [],
      issuers: [controller1.address],
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const proposalTokenjsHash = hashStringToken("access");
    const proposalTokenSignature = await controller1.signMessage(ethers.toBeArray(proposalTokenjsHash))

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber(),
    };

    // Token signature
    const token = "sometoken";
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        [token]
      )
    );
    const tokenSignature = await controller1.signMessage(ethers.getBytes(messageHash));

    // Create proposal
    await didRegistryRouter.connect(controller1).createProposalWithToken(
      owner.address,
      0,
      newDidDocument,
      [governanceMethod],
      0,
      "access",
      proposalTokenSignature
    );

    const block = await ethers.provider.getBlock("latest").then(block => block.timestamp)
    const proposalHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint", "uint", "address", "uint"],
        [0, 0, owner.address, block]
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

    const someHash = hashAddressToken(controller1.address);
    const someHash2 = hashAddressToken(controller2.address);

    const signatureIssuer1 = await controller1.signMessage(ethers.getBytes(someHash));
    const signatureIssuer2 = await controller1.signMessage(ethers.getBytes(someHash2));


    const voteParams = {
      voters: [controller2.address, controller1.address],
      votes: [true, true],
      signatures: [signature2, signature1],
      tokenSignatures: [signatureIssuer2, signatureIssuer1],
      tokens: [controller2.address, controller1.address],
      issuer: controller1.address,
      issuerIndex: 0
  };
  
  await expect(
      governance.submitVotes(
          0,
          owner.address,
          voteParams
      )
  ).to.emit(governance, "ProposalResolved")
      .withArgs(0, owner.address, true);
    
    /*await expect(
      governance.submitVotes(
          0,
          owner.address,
          [controller2.address, controller1.address],
          [true, true],
          [signature2, signature1],
          [signatureIssuer2, signatureIssuer1],
          [controller2.address, controller1.address],
          controller1.address,
          0
      )
  ).to.emit(governance, "ProposalResolved")
      .withArgs(0, owner.address, true);  // proposalId, did, approved*/

  // Verify final state
  const finalProposal = await governance.proposals(owner.address, 0);
  expect(finalProposal.resolved).to.be.true;
  expect(finalProposal.yesVotes).to.equal(2);
});

it("Should not allow voting with invalid issuer", async function () {
  const publicKey = "publicKey1";
  const authenticationMethod = "authMethod1";
  const governanceMethod = {
    methodName: "OffChainVoting",
    controllers: [],
    contractAddres: governance.target,
    contractPublicKey: "publicKey123",
    intArgs: [2],
    stringArgs: [],
    boolArgs: [],
    governanceMethodType: 1, verifierContracts: [], issuers: [controller1.address], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0,
  };

  await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

  const newDidDocument = {
    owner: owner.address,
    publicKey: "newPublicKey",
    authenticationMethod: "newAuthMethod",
    lastChanged: await ethers.provider.getBlockNumber(),
  };

  // Token signature
  const token = "sometoken";
  const messageHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string"],
      [token]
    )
  );
  const tokenSignature = await controller1.signMessage(ethers.getBytes(messageHash));

  // Create proposal
  await didRegistryRouter.connect(controller1).createProposalWithToken(
    owner.address,
    0,
    newDidDocument,
    [governanceMethod],
    0,
    token,
    tokenSignature
  );

  const block = await ethers.provider.getBlock("latest").then(block => block.timestamp)

  const proposalHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint", "uint", "address", "uint"],
      [0, 0, owner.address, block]
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


  const invalidIssuerVoteParams = {
    voters: [controller1.address, controller3.address],
    votes: [true, true],
    signatures: [signature1, signature3],
    tokenSignatures: ["0x00", "0x00"],
    tokens: [controller1.address, controller2.address],
    issuer: controller2.address,
    issuerIndex: 0
};

await expect(
    governance.submitVotes(
        0,
        owner.address,
        invalidIssuerVoteParams
    )
).to.be.revertedWith("No such issuer for this governanceProcesses");

  /*await expect(
    governance.submitVotes(
        0,
        owner.address,
        [controller1.address, controller3.address],
        [true, true],
        [signature1, signature3],
        ["0x00" , "0x00"],
         [controller1.address, controller2.address],
        controller2.address,
        0
    )
).to.be.revertedWith("No such issuer for this governanceProcesses");*/
});



  it("Should not allow voting with invalid signature", async function () {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 1, verifierContracts: [], issuers: [controller1.address], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0,
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber(),
    };

    // Token signature
    const token = "sometoken";
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        [token]
      )
    );
    const tokenSignature = await controller1.signMessage(ethers.getBytes(messageHash));

    // Create proposal
    await didRegistryRouter.connect(controller1).createProposalWithToken(
      owner.address,
      0,
      newDidDocument,
      [governanceMethod],
      0,
      token,
      tokenSignature
    );

    const block = await ethers.provider.getBlock("latest").then(block => block.timestamp)
    const proposalHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint", "uint", "address", "uint"],
        [0, 0, owner.address, block]
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

    const someHash = hashAddressToken(controller1.address);
    const someHash2 = hashAddressToken(controller2.address);

    const signatureIssuer1 = await controller1.signMessage(ethers.getBytes(someHash));
    const signatureIssuer2 = await controller2.signMessage(ethers.getBytes(someHash2));

    const invalidSignatureVoteParams = {
      voters: [controller2.address, controller1.address],
      votes: [true, true],
      signatures: [signature3, signature1],
      tokenSignatures: [signatureIssuer2, signatureIssuer1],
      tokens: [controller2.address, controller1.address],
      issuer: controller1.address,
      issuerIndex: 0
  };
  
  await expect(
      governance.submitVotes(
          0,
          owner.address,
          invalidSignatureVoteParams
      )
  ).to.be.revertedWith("Invalid signature");

    /*await expect(
      governance.submitVotes(
          0,
          owner.address,
          [controller2.address, controller1.address],
          [true, true],
          [signature3, signature1],
          [signatureIssuer2, signatureIssuer1],
         [controller2.address, controller1.address],
          controller1.address,
          0
      )
  ).to.be.revertedWith("Invalid signature");*/

});



  it("Should resolve a proposal when required votes are met", async function () {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2],  // requires 2 yes votes
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 1, verifierContracts: [], issuers: [controller1.address], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0,
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber(),
    };

   // Token signature
   const token = "sometoken";
   const messageHash = ethers.keccak256(
     ethers.AbiCoder.defaultAbiCoder().encode(
       ["string"],
       [token]
     )
   );
   const tokenSignature = await controller1.signMessage(ethers.getBytes(messageHash));

   // Create proposal
   await didRegistryRouter.connect(controller1).createProposalWithToken(
     owner.address,
     0,
     newDidDocument,
     [governanceMethod],
     0,
     token,
     tokenSignature
   );

   const block = await ethers.provider.getBlock("latest").then(block => block.timestamp)
   const proposalHash = ethers.keccak256(
     ethers.AbiCoder.defaultAbiCoder().encode(
       ["uint", "uint", "address", "uint"],
       [0, 0, owner.address, block]
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

   const someHash = hashAddressToken(controller1.address);
   const someHash2 = hashAddressToken(controller2.address);

   const signatureIssuer1 = await controller1.signMessage(ethers.getBytes(someHash));
   const signatureIssuer2 = await controller1.signMessage(ethers.getBytes(someHash2));

   const requiredVotesParams = {
    voters: [controller2.address, controller1.address],
    votes: [true, true],
    signatures: [signature2, signature1],
    tokenSignatures: [signatureIssuer2, signatureIssuer1],
    tokens: [controller2.address, controller1.address],
    issuer: controller1.address,
    issuerIndex: 0
    };

    await expect(
        governance.submitVotes(
            0,
            owner.address,
            requiredVotesParams
        )
    ).to.emit(governance, "ProposalResolved")
        .withArgs(0, owner.address, true);

   /*await expect(
     governance.submitVotes(
         0,
         owner.address,
         [controller2.address, controller1.address],
         [true, true],
         [signature2, signature1],
         [signatureIssuer2, signatureIssuer1],
         [controller2.address, controller1.address],
         controller1.address,
         0
     )
 ).to.emit(governance, "ProposalResolved")
     .withArgs(0, owner.address, true);  // proposalId, did, approved*/
  
});

  it("Invalid issuer", async function () {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const governanceMethod = {
      methodName: "OffChainVoting",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [0],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 1, verifierContracts: [], issuers: [controller1.address], expiresAt: 0, blockedUntil: 0, editRightsLevel: 0,
    };

    await didRegistry.connect(owner).createDIDDocument(publicKey, authenticationMethod, [governanceMethod]);

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber(),
    };

    // no token is issued by controller
   await expect(
     didRegistryRouter.connect(controller1).createProposalWithToken(
     owner.address,
     0,
     newDidDocument,
     [governanceMethod],
     0,
     "0x",
     "0x"
   )
    ).to.be.revertedWith("not correct issuer");
  });
});