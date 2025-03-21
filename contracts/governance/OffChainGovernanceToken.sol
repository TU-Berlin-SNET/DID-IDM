// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/Credentials.sol";
import "../interfaces/IDIDRegistry.sol";
import "../interfaces/IGovernanceMethod.sol";

//governance contract that verifies offchain votes with credentials contract

contract OffChainGovernanceToken is IGovernanceMethod {
    using ECDSA for bytes32;

    struct OffChainProposal {
        uint id;
        address did;
        bytes32 hash;
        //uint votingDeadline;
        uint requiredYesVotes;
        uint yesVotes;
        uint noVotes;
        address[] voters; // list of controllers that voted
        bool resolved;
      //address[] controllers;
        address[] issuers;
    }

    //grouping the variables because too many variables in the stack
    struct VoteParams {
        address[] voters;
        bool[] votes;
        bytes[] signatures;
        bytes[] tokenSignatures;
        address[] tokens;
        address issuer;
        uint issuerIndex;
    }

    mapping(address => OffChainProposal[]) public proposals;
 

    Credentials private credentials;
    address public didRegistry;

    event ProposalCreated(
        uint proposalId,
        address indexed did,
        bytes32 hash,
        //uint deadline
        uint requiredYesVotes
    );
    event VotesSubmitted(
        uint proposalId,
        address indexed did,
        uint yesVotes,
        uint noVotes
    );
    event ProposalResolved(uint proposalId, address indexed did, bool approved);

    // credentials contract also included in constructor
    constructor(address _credentials, address _didRegistry) {
        credentials = Credentials(_credentials);
        didRegistry = _didRegistry;
    }


  /*function isController(
        address account,
        address did,
        uint proposalId,
        uint index
    ) public view returns (bool) {
        OffChainProposal storage proposal = proposals[did][proposalId];
        // valid length and index lookup
        return index < proposal.controllers.length && proposal.controllers[index] == account;
    } */


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

        // Add validation check with require statement
        require(
            validateGovernanceMethodConfiguration(govMethodDetails),
            "Invalid governance method configuration"
        );

        OffChainProposal memory newProposal = OffChainProposal({
            id: proposalId,
            did: did,
            hash: keccak256(abi.encode(proposalId, proposalIndex, did, block.timestamp)),
            requiredYesVotes: govMethodDetails.intArgs[0],
            yesVotes: 0,
            noVotes: 0,
            voters: new address[](0),
            resolved: false,
          //controllers: govMethodDetails.controllers,
            issuers: govMethodDetails.issuers
        });

        proposals[did].push(newProposal);
        emit ProposalCreated(
            proposalId,
            did,
            newProposal.hash,
            newProposal.requiredYesVotes
        );
    }


    function submitVotes(
        uint proposalId,
        address did,
        VoteParams calldata voteParams
    ) external {
        require(proposals[did].length > proposalId, "Invalid proposal ID");
        OffChainProposal storage proposal = proposals[did][proposalId];
        require(!proposal.resolved, "Proposal already resolved");

        require(
            voteParams.voters.length == voteParams.votes.length && 
            voteParams.votes.length == voteParams.signatures.length,
            "Array length mismatch"
        );

        require(
            proposal.issuers[voteParams.issuerIndex] == voteParams.issuer,
            "No such issuer for this governanceProcesses"
        );

        for (uint i = 0; i < voteParams.voters.length; i++) {
            require(voteParams.voters[i] != address(0), "Invalid voter address");
            
            if (i > 0) {
                require(voteParams.voters[i] > voteParams.voters[i-1], "Voters must be in ascending order");
            }

            bytes32 messageHash = keccak256(
                abi.encodePacked(proposal.hash, voteParams.votes[i])
            );

            require(
                credentials.recoverSigner(messageHash, voteParams.signatures[i]) == voteParams.voters[i],
                "Invalid signature"
            );
            
            require(
                credentials.recoverTokenSigner(voteParams.tokens[i], voteParams.tokenSignatures[i]) == voteParams.issuer,
                "Invalid token"
            );

            if (voteParams.votes[i]) {
                proposal.yesVotes++;
                if (proposal.yesVotes >= proposal.requiredYesVotes) {
                    resolveProposal(proposalId, did);
                    return;
                }
            } else {
                proposal.noVotes++;
            }
        }

        emit VotesSubmitted(
            proposalId,
            did,
            proposal.yesVotes,
            proposal.noVotes
        );
    }
    // votes are verified using credentials contract (offchain)
    /*function submitVotes(
        uint proposalId,
        address did,
        address[] calldata voters,
        bool[] calldata votes,
        bytes[] calldata signatures,
        bytes[] calldata tokenSignatures,
        address[] calldata tokens,
        address issuer,
        uint issuerIndex
        
    ) external {

        require(proposals[did].length > proposalId, "Invalid proposal ID");
        OffChainProposal storage proposal = proposals[did][proposalId];
        require(!proposal.resolved, "Proposal already resolved");
        // TODO: lets do our life easier and requeire from the users that the voters.lengh == controllers.length
        // some entries can be then equel to null but we will check for this
        // isController() will be able then to do simple index check instead of itererating

        // ^^^ This is handled from the test side
        require(
           voters.length == votes.length && 
            votes.length == signatures.length,
            "Array length mismatch"
        );
        /*require(
            voters.length == votes.length && votes.length == signatures.length,
            "Mismatched input lengths"
        );

         require(
            proposal.issuers[issuerIndex] == issuer,
            "No such issuer for this governanceProcesses"
        );

        for (uint i = 0; i < voters.length; i++) {
        require(voters[i] != address(0), "Invalid voter address");
        
                if (i > 0) {
            require(voters[i] > voters[i-1], "Voters must be in ascending order");
        }
    
            /*require(
                isController(voters[i], did, proposalId, i),
                "Only controllers can vote"
            );

            

            bytes32 messageHash = keccak256(
                abi.encodePacked(proposal.hash, votes[i])
            );



            require(
                credentials.recoverSigner(messageHash, signatures[i]) == voters[i],
                "Invalid signature"
            );
            require(

                
                //credentials.recoverTokenSigner(tokens[i], tokenSignatures[i]) == voters[i],

                //todo: this will require refactoring to the code
                credentials.recoverTokenSigner(tokens[i], tokenSignatures[i]) == issuer,
                "Invalid token"

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
        }

            emit VotesSubmitted(
            proposalId,
            did,
            proposal.yesVotes,
            proposal.noVotes
        );
        }*/

    //resolve is same
    function resolveProposal(uint proposalId, address did) internal {
        require(proposals[did].length > proposalId, "Invalid proposal ID");
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
        // Check both controllers length and intArgs length
        return governanceMethodConfiguration.issuers.length > 0 
        && governanceMethodConfiguration.intArgs[0] > 0;
    }

}

