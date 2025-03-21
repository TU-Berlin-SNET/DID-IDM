// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IGovernanceMethod.sol";
import "../interfaces/IDIDRegistry.sol";

//Simple governance method with a counter where controllers can vote Yes or No, and the proposal is executed if the specified number of Yes votes is reached

contract CounterLogicGovernance is IGovernanceMethod {
    enum GovernanceStatus {
        Pending,
        Approved,
        Rejected
    }
    struct GovernanceProcess {
        GovernanceStatus governanceStatus;
        uint proposalId;
        uint proposalIndex;
        address did;
        uint governanceMethodIndex;
        address[] controllers;
        ////// GOvernanceMetrho specific stuff
        uint requiredYesVotes; // requred numbers of votes to reject the propoosal
        uint requiredNoVotes; // requred numbers of votes to reject the propoosal
        uint yesVotes;
        uint noVotes;
    }

    address[] public controllers; // list of controllers
    uint public requiredYesVotes; // min number of "yes" votes required for approval, defined by the constructor
    mapping(uint => GovernanceProcess) public governanceProcesses; // Governace processes maping mapping by I
    mapping(uint => mapping(address => bool)) voters;

    address public didRegistryAddress;
    event VoteCast(uint proposalId, address voter, bool approve);
    event GovernaceProcessApproved(uint proposalId);

    constructor(address _didRegistryAddress) {
        didRegistryAddress = _didRegistryAddress;
    }
    function isController(address account) public view returns (bool) {
        for (uint i = 0; i < controllers.length; i++) {
            if (controllers[i] == account) {
                return true;
            }
        }
        return false;
    }

       function initiateGovernanceProcess(
        uint proposalId,
        uint proposalIndex,
        address did,
        uint governanceMethodIndex,
        address caller
    ) external override {
        // get the configuration of the Governance metrhod from the did reigisty
        GovernanceMethod memory govMethodDetails = IDIDRegistry(
            didRegistryAddress
        ).getGovernanceMethod(did, governanceMethodIndex);

        require(
            validateGovernanceMethodConfiguration(govMethodDetails),
            "Required number of votes is higher than the number of controllers!"
        );

        governanceProcesses[proposalId] = GovernanceProcess({
            governanceStatus: GovernanceStatus.Pending,
            proposalId: proposalId,
            proposalIndex: proposalIndex,
            did: did,
            governanceMethodIndex: governanceMethodIndex,
            requiredYesVotes: govMethodDetails.intArgs[0],
            requiredNoVotes: govMethodDetails.intArgs[1],
            yesVotes: 0,
            noVotes: 0,
            controllers: govMethodDetails.controllers
        });

        emit GovernaceProcessApproved(proposalId);
    }

    function isController(
        address account,
        uint proposalId
    ) public view returns (bool) {
        for (
            uint i = 0;
            i < governanceProcesses[proposalId].controllers.length;
            i++
        ) {
            if (governanceProcesses[proposalId].controllers[i] == account) {
                return true;
            }
        }
        return false;
    }

    //controllers can vote a Yes or No
    function vote(uint proposalId, bool approve) external {
        require(
            isController(msg.sender, proposalId),
            "Only controllers can vote"
        );
        GovernanceProcess storage proposal = governanceProcesses[proposalId];
        require(
            proposal.governanceStatus == GovernanceStatus.Pending,
            "GovernaceProcess already approved"
        );
        require(!voters[proposalId][msg.sender], "Controller already voted");

        voters[proposalId][msg.sender] = true;

        if (approve) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        if (proposal.yesVotes >= proposal.requiredYesVotes) {
            governanceProcesses[proposalId].governanceStatus = GovernanceStatus
                .Approved;
            IDIDRegistry(didRegistryAddress).resolveProposal(
                governanceProcesses[proposalId].proposalId,
                governanceProcesses[proposalId].proposalIndex,
                governanceProcesses[proposalId].did,
                true
            );

            emit GovernaceProcessApproved(proposalId);
        } else if (proposal.noVotes >= proposal.requiredNoVotes) {
            // in this case w reject the proposal
            governanceProcesses[proposalId].governanceStatus = GovernanceStatus
                .Rejected;
            IDIDRegistry(didRegistryAddress).resolveProposal(
                governanceProcesses[proposalId].proposalId,
                governanceProcesses[proposalId].proposalIndex,
                governanceProcesses[proposalId].did,
                false
            );
            emit GovernaceProcessApproved(proposalId);
        }

        emit VoteCast(proposalId, msg.sender, approve);
    }

    //executed if required number of Yes votes is reached
    function isApproved(uint proposalId) external view returns (bool) {
        GovernanceProcess storage proposal = governanceProcesses[proposalId];
        return proposal.governanceStatus == GovernanceStatus.Approved;
    }

    //function isApproved(uint proposalId) external view returns (bool) {
    //    GovernaceProcess storage proposal = governanceProcesses[proposalId];
    //    return proposal.yesVotes >= requiredYesVotes;
    //}

    function validateGovernanceMethodConfiguration(
        GovernanceMethod memory governanceMethodConfiguration
    ) public pure override returns (bool) {
        return (governanceMethodConfiguration.intArgs[0] <= governanceMethodConfiguration.controllers.length && governanceMethodConfiguration.intArgs[1] <= governanceMethodConfiguration.controllers.length);
    }

}



