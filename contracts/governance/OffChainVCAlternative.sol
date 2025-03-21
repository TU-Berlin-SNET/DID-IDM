// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/Credentials.sol";
import "../interfaces/IDIDRegistry.sol";
import "../interfaces/IGovernanceMethod.sol";
import "hardhat/console.sol";


// Alternative governance contract that compiles without viaIR, because the original one gives errors. 

contract OffChainVCAlternative is IGovernanceMethod {
    struct OffChainProposal {
        uint id;
        address did;
        bytes32 hash;
        uint requiredYesVotes;
        uint yesVotes;
        uint noVotes;
        address[] voters;
        bool resolved;
        address[] issuers;
        GovernanceMethodType governanceMethodType;
        address[] verifierContracts;
    }

    struct VoteParams {
        uint proposalId;
        address did;
        address voter;
        bool vote;
        bytes voteSignature;
        bytes credentialSignature;
        address issuer;
    }

    struct CredentialData {
        string[] strings;
        uint256[] numbers;
        bool[] bools;
        address[] addresses;
    }

    mapping(address => OffChainProposal[]) public proposals;
    Credentials private credentialsContract;
    address public didRegistry;

    event ProposalCreated(uint proposalId, address indexed did, bytes32 hash, uint requiredYesVotes);
    event VotesSubmitted(uint proposalId, address indexed did, uint yesVotes, uint noVotes);
    event ProposalResolved(uint proposalId, address indexed did, bool approved);

    constructor(address _credentials, address _didRegistry) {
        credentialsContract = Credentials(_credentials);
        didRegistry = _didRegistry;
    }

    function _verifyVoteSignature(
        bytes32 proposalHash,
        address voter,
        bool vote,
        bytes memory signature
    ) private view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(proposalHash, vote));
        return credentialsContract.recoverSigner(messageHash, signature) == voter;
    }

    function _validateCredentials(
        address issuer,
        address voter,
        CredentialData memory data,
        bytes memory signature
    ) private view returns (bool) {
        return credentialsContract.verifyVCSignature(
            issuer,
            data.strings,
            data.numbers,
            data.bools,
            data.addresses,
            signature
        );
    }

    function _processVote(
        OffChainProposal storage proposal,
        VoteParams memory params,
        CredentialData memory credData
    ) private returns (bool) {
        require(
            _validateCredentials(params.issuer, params.voter, credData, params.credentialSignature),
            "Invalid credentials"
        );

        require(
            _verifyVoteSignature(proposal.hash, params.voter, params.vote, params.voteSignature),
            "Invalid vote signature"
        );

        if (params.vote) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }
        proposal.voters.push(params.voter);

        return params.vote && proposal.yesVotes >= proposal.requiredYesVotes;
    }

    function submitVotesBatch(
        address[] memory voters,
        bool[] memory votes,
        bytes[] memory voteSignatures,
        bytes[] memory credentialSignatures,
        address issuer,
        uint proposalId,
        address did,
        CredentialData memory credData
    ) external {
        require(proposals[did].length > proposalId, "Invalid proposal ID");
        OffChainProposal storage proposal = proposals[did][proposalId];
        require(!proposal.resolved, "Proposal already resolved");
        
        uint len = voters.length;
        require(len == votes.length && len == voteSignatures.length, "Length mismatch");

        for (uint i = 1; i < len; i++) {
            require(voters[i] > voters[i-1], "Voters must be in ascending order");
        }

        for (uint i = 0; i < len; i++) {
            VoteParams memory voteParams = VoteParams({
                proposalId: proposalId,
                did: did,
                voter: voters[i],
                vote: votes[i],
                voteSignature: voteSignatures[i],
                credentialSignature: credentialSignatures[i],
                issuer: issuer
            });

            if (_processVote(proposal, voteParams, credData)) {
                _resolveProposal(proposalId, did);
                return;
            }
        }

        emit VotesSubmitted(proposalId, did, proposal.yesVotes, proposal.noVotes);
    }

    function initiateGovernanceProcess(
        uint proposalId,
        uint proposalIndex,
        address did,
        uint governanceMethodIndex,
        address caller
    ) external override {
        require(msg.sender == didRegistry, "Only DIDRegistry can call this function");
        GovernanceMethod memory govMethodDetails = IDIDRegistry(didRegistry).getGovernanceMethod(did, governanceMethodIndex);
        require(validateGovernanceMethodConfiguration(govMethodDetails), "Invalid governance method configuration");

        OffChainProposal storage newProposal = proposals[did].push();
        newProposal.id = proposalId;
        newProposal.did = did;
        newProposal.hash = keccak256(abi.encode(proposalId, proposalIndex, did, block.timestamp));
        newProposal.requiredYesVotes = govMethodDetails.intArgs[0];
        newProposal.issuers = govMethodDetails.issuers;
        newProposal.governanceMethodType = govMethodDetails.governanceMethodType;
        newProposal.verifierContracts = govMethodDetails.verifierContracts;

        emit ProposalCreated(proposalId, did, newProposal.hash, newProposal.requiredYesVotes);
    }

    function _resolveProposal(uint proposalId, address did) private {
        OffChainProposal storage proposal = proposals[did][proposalId];
        proposal.resolved = true;
        
        IDIDRegistry(didRegistry).resolveProposal(
            proposal.id,
            proposalId,
            did,
            proposal.yesVotes >= proposal.requiredYesVotes
        );

        emit ProposalResolved(proposalId, did, proposal.yesVotes >= proposal.requiredYesVotes);
    }

    function validateGovernanceMethodConfiguration(
        GovernanceMethod memory governanceMethodConfiguration
    ) public pure override returns (bool) {
        return governanceMethodConfiguration.issuers.length > 0 && 
               governanceMethodConfiguration.intArgs[0] > 0;
    }
}