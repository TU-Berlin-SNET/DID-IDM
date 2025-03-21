const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OffChainGovernanceVCAlternative", function () {
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

    beforeEach(async function () {
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

        await didRegistry.setDIDRegistryRouterAddress(didRegistryRouter.target);

        OffChainGovernanceVC = await ethers.getContractFactory("OffChainVCAlternative");
        governance = await OffChainGovernanceVC.deploy(credentials.target, didRegistry.target);
        await governance.waitForDeployment();

        AgeVerifier = await ethers.getContractFactory("AgeVerifier");
        ageVerifier = await AgeVerifier.deploy(didRegistryRouter.target, credentials.target);
        await ageVerifier.waitForDeployment();
    });

    it("Should allow voting with valid credentials and resolve when required votes are met", async function () {
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
            lastChanged: 0,
        };

        const _strings = ["age_verification"];
        const _numbers = [18];
        const _bools = [true];
        const _addresses = [owner.address];

        const jsHash = hashCredentials(_strings, _numbers, _bools, _addresses);
        const credentialsSignature = await issuer1.signMessage(ethers.getBytes(jsHash));

        const proposalTx = await ageVerifier.connect(issuer1).createProposal(
            owner.address,
            0,
            newDidDocument,
            [newGovernanceMethod],
            _strings,
            _numbers,
            _bools,
            _addresses,
            credentialsSignature,
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

        const sortedVoters = [voter1.address, voter2.address].sort();

        const voteSignatures = await Promise.all(
            sortedVoters.map(async (voter) => {
                const voteHash = ethers.keccak256(
                    ethers.solidityPacked(
                        ["bytes32", "bool"],
                        [proposalHash, true]
                    )
                );
                const signer = voter === voter1.address ? voter1 : voter2;
                return signer.signMessage(ethers.getBytes(voteHash));
            })
        );

        const credData = {
            strings: ["age_verification"],
            numbers: [18],
            bools: [true],
            addresses: sortedVoters
        };

        const credentialSignatures = await Promise.all(
            sortedVoters.map(async () => {
                const credHash = hashCredentials(
                    credData.strings,
                    credData.numbers,
                    credData.bools,
                    credData.addresses
                );
                return issuer1.signMessage(ethers.getBytes(credHash));
            })
        );

        await governance.submitVotesBatch(
            sortedVoters,
            Array(sortedVoters.length).fill(true),
            voteSignatures,
            credentialSignatures,
            issuer1.address,
            0,
            owner.address,
            credData
        );

        const updatedDid = await didRegistry.didDocuments(owner.address);
        expect(updatedDid.publicKey).to.equal("newPublicKey");
        expect(updatedDid.authenticationMethod).to.equal("newAuthMethod");
    });

    it("Should not allow unordered voter addresses", async function () {
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
            issuers: [issuer1.address],
            expiresAt: 0,
            blockedUntil: 0,
            editRightsLevel: 0,
        };

        const newDidDocument = {
            owner: owner.address,
            publicKey: "newPublicKey",
            authenticationMethod: "newAuthMethod",
            lastChanged: 0,
        };

        const _strings = ["age_verification"];
        const _numbers = [18];
        const _bools = [true];
        const _addresses = [owner.address];

        const jsHash = hashCredentials(_strings, _numbers, _bools, _addresses);
        const credentialSignature = await issuer1.signMessage(ethers.getBytes(jsHash));

        await ageVerifier.connect(issuer1).createProposal(
            owner.address,
            0,
            newDidDocument,
            [newGovernanceMethod],
            _strings,
            _numbers,
            _bools,
            _addresses,
            credentialSignature,
            issuer1.address,
            0
        );

        //unordered addresses, the normal list is already unordered so
        const unorderedVoters = [voter1.address, voter2.address]; 
        const credData = {
            strings: ["age_verification"],
            numbers: [18],
            bools: [true],
            addresses: unorderedVoters
        };

        const voteSignatures = await Promise.all(
            unorderedVoters.map(async () => ethers.Wallet.createRandom().signMessage(ethers.getBytes("0x00")))
        );

        const credentialSignatures = await Promise.all(
            unorderedVoters.map(async () => issuer1.signMessage(ethers.getBytes("0x00")))
        );

        await expect(
            governance.submitVotesBatch(
                unorderedVoters,
                [true, true],
                voteSignatures,
                credentialSignatures,
                issuer1.address,
                0,
                owner.address,
                credData
            )
        ).to.be.revertedWith("Voters must be in ascending order");
    });

    it("Should not allow creating proposals without valid credentials", async function () {
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
            lastChanged: 0,
        };

        const _strings = ["age_verification"];
        const _numbers = [16]; 
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