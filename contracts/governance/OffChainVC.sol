// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/Credentials.sol";
import "../interfaces/IDIDRegistry.sol";
import "../interfaces/IGovernanceMethod.sol";
import "hardhat/console.sol";

contract OffChainVC is IGovernanceMethod {
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

    //struct for the VCs, to use less local variables
    struct VerifiableCredential {
        string[] strings;
        uint256[] numbers;
        bool[] bools;
        address[] addresses;
        bytes signature;
    }

    //another struct for the vote
    struct VoteData {
        address voter;
        bool vote;
        bytes voteSignature;
        VerifiableCredential credential;
    }

    mapping(address => OffChainProposal[]) public proposals;
    Credentials private credentialsContract;
    address public didRegistry;

    event ProposalCreated(
        uint proposalId,
        address indexed did,
        bytes32 hash,
        uint requiredYesVotes
    );
    event VotesSubmitted(
        uint proposalId,
        address indexed did,
        uint yesVotes,
        uint noVotes
    );
    event ProposalResolved(uint proposalId, address indexed did, bool approved);

    constructor(address _credentials, address _didRegistry) {
        credentialsContract = Credentials(_credentials);
        didRegistry = _didRegistry;
    }

    function initiateGovernanceProcess(
        uint proposalId,
        uint proposalIndex,
        address did,
        uint governanceMethodIndex,
        address caller
    ) external override {
        require(
            msg.sender == didRegistry,
            "Only DIDRegistry can call this function"
        );

        GovernanceMethod memory govMethodDetails = IDIDRegistry(didRegistry)
            .getGovernanceMethod(did, governanceMethodIndex);

        require(
            validateGovernanceMethodConfiguration(govMethodDetails),
            "Invalid governance method configuration"
        );

        OffChainProposal storage newProposal = proposals[did].push();
        newProposal.id = proposalId;
        newProposal.did = did;
        newProposal.hash = keccak256(
            abi.encode(proposalId, proposalIndex, did, block.timestamp)
        );
        newProposal.requiredYesVotes = govMethodDetails.intArgs[0];
        newProposal.yesVotes = 0;
        newProposal.noVotes = 0;
        newProposal.resolved = false;
        newProposal.issuers = govMethodDetails.issuers;
        newProposal.governanceMethodType = govMethodDetails
            .governanceMethodType;
        newProposal.verifierContracts = govMethodDetails.verifierContracts;

        emit ProposalCreated(
            proposalId,
            did,
            newProposal.hash,
            newProposal.requiredYesVotes
        );
    }

    function _processVote(
        OffChainProposal storage proposal,
        VoteData memory voteData,
        address issuer
    ) private returns (bool) {
        // Verify VC
        require(
            credentialsContract.verifyVCSignature(
                issuer,
                voteData.credential.strings,
                voteData.credential.numbers,
                voteData.credential.bools,
                voteData.credential.addresses,
                voteData.credential.signature
            ),
            "not valid credentials"
        );

        // Verify vote signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(proposal.hash, voteData.vote)
        );
        require(
            credentialsContract.recoverSigner(
                messageHash,
                voteData.voteSignature
            ) == voteData.voter,
            "Invalid vote signature"
        );

        if (voteData.vote) {
            proposal.yesVotes++;
            proposal.voters.push(voteData.voter);
            return proposal.yesVotes >= proposal.requiredYesVotes;
        } else {
            proposal.noVotes++;
            proposal.voters.push(voteData.voter);
            return false;
        }
    }

    function submitVotes(
        uint proposalId,
        address did,
        VoteData[] calldata votesData,
        address issuer,
        uint issuerIndex
    ) external {
        require(proposals[did].length > proposalId, "Invalid proposal ID");
        OffChainProposal storage proposal = proposals[did][proposalId];
        require(!proposal.resolved, "Proposal already resolved");
        require(proposal.issuers[issuerIndex] == issuer, "Invalid issuer");

        uint len = votesData.length;
        require(len > 0, "No votes provided");

        for (uint i = 0; i < len; i++) {
            require(votesData[i].voter != address(0), "Invalid voter address");

            if (i > 0) {
                require(
                    votesData[i].voter > votesData[i - 1].voter,
                    "Voters must be in ascending order"
                );
            }

            if (_processVote(proposal, votesData[i], issuer)) {
                resolveProposal(proposalId, did);
                return;
            }
        }

        emit VotesSubmitted(
            proposalId,
            did,
            proposal.yesVotes,
            proposal.noVotes
        );
    }

    function resolveProposal(uint proposalId, address did) internal {
        OffChainProposal storage proposal = proposals[did][proposalId];
        require(!proposal.resolved, "Proposal already resolved");

        bool approved = proposal.yesVotes >= proposal.requiredYesVotes;
        proposal.resolved = true;

        IDIDRegistry(didRegistry).resolveProposal(
            proposal.id,
            proposalId,
            did,
            approved
        );

        emit ProposalResolved(proposalId, did, approved);
    }

    function validateGovernanceMethodConfiguration(
        GovernanceMethod memory governanceMethodConfiguration
    ) public pure override returns (bool) {
        return
            governanceMethodConfiguration.issuers.length > 0 &&
            governanceMethodConfiguration.intArgs[0] > 0;
    }
}

