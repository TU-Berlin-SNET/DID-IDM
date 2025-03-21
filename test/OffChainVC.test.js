const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OffChainGovernanceVC", function() {
  let DIDRegistry, OffChainGovernanceVC, Credentials;
  let didRegistry, governance, credentials;
  let owner, issuer1, issuer2, voter1, voter2, other;

  function hashCredentials(strings, numbers, bools, addresses) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string[]", "uint256[]", "bool[]", "address[]"],
      [strings, numbers, bools, addresses]
    );
    return ethers.keccak256(encoded);
  }


  async function setupInitialDID() {
    const publicKey = "publicKey1";
    const authenticationMethod = "authMethod1";
    const initialGovernanceMethod = {
      methodName: "InitialGov",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 3,
      verifierContracts: [ageVerifier.target],
      issuers: [issuer1.address],
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0,
    };

    await didRegistry.connect(owner).createDIDDocument(
      publicKey,
      authenticationMethod,
      [initialGovernanceMethod]
    );

    return initialGovernanceMethod;
  }

  beforeEach(async function() {
    [owner, issuer1, issuer2, voter1, voter2, other] = await ethers.getSigners();

    Credentials = await ethers.getContractFactory("Credentials");
    credentials = await Credentials.deploy();
    await credentials.waitForDeployment();

    DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDRegistry.deploy();
    await didRegistry.waitForDeployment();

    DIDRegistryRouter = await ethers.getContractFactory("DIDRegistryRouter");
    didRegistryRouter = await DIDRegistryRouter.deploy(didRegistry.target, credentials.target);
    await didRegistryRouter.waitForDeployment();

    didRegistry.setDIDRegistryRouterAddress(didRegistryRouter.target);

    OffChainGovernanceVC = await ethers.getContractFactory("OffChainVC");
    governance = await OffChainGovernanceVC.deploy(credentials.target, didRegistry.target);
    await governance.waitForDeployment();

    AgeVerifier = await ethers.getContractFactory("AgeVerifier");
    ageVerifier = await AgeVerifier.deploy(didRegistryRouter.target, credentials.target);
    await ageVerifier.waitForDeployment();
  });

  it("Should allow voting with valid credentials and resolve when required votes are met", async function() {
    await setupInitialDID();

    const newGovernanceMethod = {
      methodName: "VCVoting",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 3,
      verifierContracts: [ageVerifier.target],
      issuers: [issuer1.address],
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0,
    };

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber(),
    };

    // Create proposal with issuer1's credentials
    const proposalStrings = ["age_verification"];
    const proposalNumbers = [18];
    const proposalBools = [true];
    const proposalAddresses = [owner.address];

    const proposalCredHash = hashCredentials(proposalStrings, proposalNumbers, proposalBools, proposalAddresses);
    const proposalCredSignature = await issuer1.signMessage(ethers.getBytes(proposalCredHash));

    const proposalTx = await ageVerifier.connect(issuer1).createProposal(
      owner.address,
      0,
      newDidDocument,
      [newGovernanceMethod],
      proposalStrings,
      proposalNumbers,
      proposalBools,
      proposalAddresses,
      proposalCredSignature,
      issuer1.address,
      0
    );

    const proposalReceipt = await proposalTx.wait();
    const block = await ethers.provider.getBlock(proposalReceipt.blockNumber);

    const proposalHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint", "uint", "address", "uint"],
        [0, 0, owner.address, block.timestamp]
      )
    );

    // Create vote data for both voters
    const sortedVoters = [voter1, voter2].sort((a, b) => a.address.localeCompare(b.address));

    const votesData = await Promise.all(sortedVoters.map(async (voter) => {
      // Create vote signature
      const voteHash = ethers.keccak256(
        ethers.solidityPacked(
          ["bytes32", "bool"],
          [proposalHash, true]
        )
      );
      const voteSignature = await voter.signMessage(ethers.getBytes(voteHash));

      // Create VC for voter
      const voterStrings = ["age_verification"];
      const voterNumbers = [18];
      const voterBools = [true];
      const voterAddresses = [voter.address];

      const credHash = hashCredentials(voterStrings, voterNumbers, voterBools, voterAddresses);
      const credSignature = await issuer1.signMessage(ethers.getBytes(credHash));

      return {
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
      };
    }));

    await governance.submitVotes(
      0,
      owner.address,
      votesData,
      issuer1.address,
      0


    );

    const updatedDid = await didRegistry.didDocuments(owner.address);
    expect(updatedDid.publicKey).to.equal("newPublicKey");
    expect(updatedDid.authenticationMethod).to.equal("newAuthMethod");
  });

  it("Should not allow unordered voter addresses", async function() {
    await setupInitialDID();

    const newGovernanceMethod = {
      methodName: "VCVoting",
      controllers: [],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 3,
      verifierContracts: [ageVerifier.target],
      issuers: [issuer1.address],
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0,
    };

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber(),
    };

    // Create proposal
    const proposalStrings = ["age_verification"];
    const proposalNumbers = [18];
    const proposalBools = [true];
    const proposalAddresses = [owner.address];

    const proposalCredHash = hashCredentials(proposalStrings, proposalNumbers, proposalBools, proposalAddresses);
    const proposalCredSignature = await issuer1.signMessage(ethers.getBytes(proposalCredHash));

    await ageVerifier.connect(issuer1).createProposal(
      owner.address,
      0,
      newDidDocument,
      [newGovernanceMethod],
      proposalStrings,
      proposalNumbers,
      proposalBools,
      proposalAddresses,
      proposalCredSignature,
      issuer1.address,
      0
    );

    const block = await ethers.provider.getBlock("latest");
    const proposalHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint", "uint", "address", "uint"],
        [0, 0, owner.address, block.timestamp]
      )
    );

    // Create unordered vote data
    const votesData = [];

    // First voter
    const vote1Hash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bool"],
        [proposalHash, true]
      )
    );

    const vote2Hash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "bool"],
        [proposalHash, true]
      )
    );

    const vote1Signature = await voter1.signMessage(ethers.getBytes(vote1Hash));
    const vote2Signature = await voter2.signMessage(ethers.getBytes(vote2Hash));

    const cred1Hash = hashCredentials(
      ["age_verification"],
      [18],
      [true],
      [voter1.address]
    );
    const cred1Signature = await issuer1.signMessage(ethers.getBytes(cred1Hash));

    // Second voter


    const cred2Hash = hashCredentials(
      ["age_verification"],
      [18],
      [true],
      [voter2.address]
    );
    const cred2Signature = await issuer1.signMessage(ethers.getBytes(cred2Hash));

    // Add votes in wrong order (voter1 before voter2)
    votesData.push({
      voter: voter1.address,
      vote: true,
      voteSignature: vote1Signature,
      credential: {
        strings: ["age_verification"],
        numbers: [18],
        bools: [true],
        addresses: [voter1.address],
        signature: cred1Signature
      }
    });

    votesData.push({
      voter: voter2.address,
      vote: true,
      voteSignature: vote2Signature,
      credential: {
        strings: ["age_verification"],
        numbers: [18],
        bools: [true],
        addresses: [voter2.address],
        signature: cred2Signature
      }
    });

    await expect(
      governance.submitVotes(
        0,
        owner.address,
        votesData,
        issuer1.address,
        0
      )
    ).to.be.revertedWith("Voters must be in ascending order");
  });

  it("Should not allow creating proposals without valid credentials", async function() {
    await setupInitialDID();

    const newGovernanceMethod = {
      methodName: "VCVoting",
      controllers: [issuer1.address],
      contractAddres: governance.target,
      contractPublicKey: "publicKey123",
      intArgs: [2],
      stringArgs: [],
      boolArgs: [],
      governanceMethodType: 3,
      verifierContracts: [ageVerifier.target],
      issuers: [],
      expiresAt: 0,
      blockedUntil: 0,
      editRightsLevel: 0,
    };

    const newDidDocument = {
      owner: owner.address,
      publicKey: "newPublicKey",
      authenticationMethod: "newAuthMethod",
      lastChanged: await ethers.provider.getBlockNumber(),
    };

    const _strings = ["age_verification"];
    const _numbers = [16];  // Age too low
    const _bools = [true];
    const _addresses = [owner.address];

    const jsHash = hashCredentials(_strings, _numbers, _bools, _addresses);
    const signature = await issuer1.signMessage(ethers.getBytes(jsHash));

    await expect(
      ageVerifier.connect(issuer1).createProposal(
        owner.address,
        0,
        newDidDocument,
        [newGovernanceMethod],
        _strings,
        _numbers,
        _bools,
        _addresses,
        signature,
        issuer1.address,
        0
      )
    ).to.be.revertedWith("VC must be at least 18 years old");
  });
});
