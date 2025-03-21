// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/Credentials.sol";
import "../interfaces/IDIDRegistry.sol";
import "../interfaces/IGovernanceMethod.sol";

contract OffChainGovernanceController is IGovernanceMethod {
    using ECDSA for bytes32;

    struct OffChainProposal {
        uint id;
        address did;
        bytes32 hash;
        uint requiredYesVotes;
        uint yesVotes;
        uint noVotes;
        address[] voters;
        bool resolved;
        address[] controllers;
        // if we assume the initial governance methods are already sorted, we can remove this mapping.
        mapping(address => bool) isControllerMap;
    }

    mapping(address => OffChainProposal[]) public proposals;
    Credentials private credentials;
    address public didRegistry;

    event ProposalCreated(uint proposalId, address indexed did, bytes32 hash, uint requiredYesVotes);
    event VotesSubmitted(uint proposalId, address indexed did, uint yesVotes, uint noVotes);
    event ProposalResolved(uint proposalId, address indexed did, bool approved);

    constructor(address _credentials, address _didRegistry) {
        credentials = Credentials(_credentials);
        didRegistry = _didRegistry;
    }

    function isController(
        address account,
        address did,
        uint proposalId
    ) public view returns (bool) {
        return proposals[did][proposalId].isControllerMap[account];
    }

    function initiateGovernanceProcess(
        uint proposalId,
        uint proposalIndex,
        address did,
        uint governanceMethodIndex,
        address caller
    ) external override {
        require(msg.sender == didRegistry, "Only DIDRegistry can call this function");

        GovernanceMethod memory govMethodDetails = IDIDRegistry(didRegistry)
            .getGovernanceMethod(did, governanceMethodIndex);

        require(validateGovernanceMethodConfiguration(govMethodDetails),
                "Invalid governance method configuration");

        OffChainProposal storage newProposal = proposals[did].push();
        newProposal.id = proposalId;
        newProposal.did = did;
        newProposal.hash = keccak256(abi.encode(proposalId, proposalIndex, did, block.timestamp));
        newProposal.requiredYesVotes = govMethodDetails.intArgs[0];
        newProposal.yesVotes = 0;
        newProposal.noVotes = 0;
        newProposal.resolved = false;
        newProposal.controllers = govMethodDetails.controllers;

        for(uint i = 0; i < govMethodDetails.controllers.length; i++) {
            newProposal.isControllerMap[govMethodDetails.controllers[i]] = true;
        }

        emit ProposalCreated(proposalId, did, newProposal.hash, newProposal.requiredYesVotes);
    }

    function submitVotes(
        uint proposalId,
        address did,
        address[] calldata voters,
        bool[] calldata votes,
        bytes[] calldata signatures
    ) external {
        require(proposals[did].length > proposalId, "Invalid proposal ID");
        OffChainProposal storage proposal = proposals[did][proposalId];
        require(!proposal.resolved, "Proposal already resolved");
        
        require(
            voters.length == votes.length && votes.length == signatures.length,
            "Length mismatch"
        );

        for (uint i = 0; i < voters.length; i++) {
            require(voters[i] != address(0), "Invalid voter address");
            
            // Check ascending order
            if (i > 0) {
                require(voters[i] > voters[i-1], "Voters must be in ascending order");
            }

            
            
            require(isController(voters[i], did, proposalId), "Only controllers can vote");

            bytes32 messageHash = keccak256(abi.encodePacked(proposal.hash, votes[i]));

            require(
                credentials.recoverSigner(messageHash, signatures[i]) == voters[i],
                "Invalid signature"
            );

            if (votes[i]) {
                proposal.yesVotes++;
                if (proposal.yesVotes >= proposal.requiredYesVotes) {
                    resolveProposal(proposalId, did);
                    return;
                }
            } else {
                proposal.noVotes++;
            }
            
            proposal.voters.push(voters[i]);
        }

        emit VotesSubmitted(proposalId, did, proposal.yesVotes, proposal.noVotes);
    }

    function resolveProposal(uint proposalId, address did) internal {
        OffChainProposal storage proposal = proposals[did][proposalId];
        require(!proposal.resolved, "Proposal already resolved");

        bool approved = proposal.yesVotes > proposal.noVotes;
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
        return governanceMethodConfiguration.controllers.length > 0 
            && governanceMethodConfiguration.intArgs[0] > 0;
    }
}