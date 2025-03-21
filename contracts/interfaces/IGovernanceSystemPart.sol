// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGovernanceSystemPart {
    enum ProposalStatus {
        Pending, // prposal was created and stored. The initiateGovernanceProcess method on the governanceMethodsContract that was specified in governance method of the proposal was called so that the governancProcess starts.
        Approved, // proposal resolved as  approved
        Rejected // proposal resolved as rejected
    }

    // specifies what the certain GovernanceMethod can edit
    enum EditRightsLevel {
        All, //  caller can edit Document +  all of the GovernanceMethod for according did.
        DelegatesCreation, // SelfGovernance +  can call createDelegates to  append new GovernanceMethods(Delegates)  to the did with EditRightsLevel==Document. should use expiresAt to make Delegates temporal
        SelfGovernance, // Caller can edit Document +  his GovernanceMethod but is not allwod to change the EditRightsLevel.
        Document // Allow edditing only the DID document content. Caller canot edit any of the GovernanceMethods.
    }
    struct DIDDocument {
        address owner;
        string publicKey;
        string authenticationMethod;
        uint lastChanged; // states the block number in witch last change happend. Might ber removed in the futer
    }
    // this enum specifies the mechanism with witch the proposals should be created for the governanceMethod
    // in otherwords witch createProposal method should be used = createProposalControllers
    enum GovernanceMethodType {
        Controllers, // strandard governanceMethodc witth contrllers a that can create the proposals.
        Token, // will have specified array of token issuers
        TokenHolder, // will have specified array of token issuers, to create Proposal it will require the additionally holder proof. In our implemntation token will be equel to the holders eth address
        VC // extension of Token based that utilisez VCs this means that verifier contract Addresses need to be provided for proposalCreation
    }
    // NOTE: this struct name will be lieklly changed to GovernanceMethodConfiguration to avoid confusion
    struct GovernanceMethod {
        string methodName;
        GovernanceMethodType governanceMethodType;
        address[] controllers;
        address[] verifierContracts; // in case Type == VC, this will specify addresses of contracts that are allowed to createProposal after they verify the VC
        address[] issuers; // in caes of Type == Token, this array will specify list of token issuers
        address contractAddres;
        string contractPublicKey;
        uint[] intArgs;
        string[] stringArgs;
        bool[] boolArgs;
        EditRightsLevel editRightsLevel;
        uint expiresAt; // 0 or  expiration time of the GovMethods. if (block.time > expiresAt && expiresAt != 0) the GovernanceMethod cannot be used anymore. if expiresAt == 0 govMethod can be used for ever
        uint blockedUntil; // 0 or time until witch GovMethods can not be used. if (block.time < blockedUntil && blockedUntil != 0)  then this GovernanceMethod can be used for proposal creation otherwise proposal creation will be not allowed. If blockedUntil == 0 then it means that there is no blocking for this govv methods.
    }
    struct Proposal {
        address did; // This is using Ethereum address for simplicity now, did:ethr not integrated yet
        DIDDocument newDidDocument; // the new Did document that will overide the old one
        ProposalStatus status; // States the status of the proposal pending | accepted | rejected
        uint governanceMethodIndex; // Index of the the used governanceMethod from old DID document
        address caller; // address of controller that called for the change of the didDocument
        uint id; // Id equel to proposalCount at the creation of the proposal
        uint timestamp; // block.timestamp during creation of the proposal
    }
}
