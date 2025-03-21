// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IGovernanceMethod.sol";
import "../interfaces/IDIDRegistry.sol";
import "hardhat/console.sol";

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract TimeLimitedGovernance is IGovernanceMethod, AutomationCompatibleInterface {
    enum GovernanceStatus {
        Pending,
        Approved,
        Rejected
    }

    uint public proposalCount;

    struct GovernanceProcess {
        GovernanceStatus governanceStatus;
        uint proposalId;
        uint proposalIndex;
        address did;
        uint governanceMethodIndex;
        address[] controllers;

        uint requiredYesVotes;
        uint requiredNoVotes;
        uint yesVotes;
        uint noVotes;

        uint startTime;
        uint duration;
    }

    address[] public controllers;
    mapping(uint => GovernanceProcess) public governanceProcesses;
    mapping(uint => mapping(address => bool)) voters;

    address public didRegistryAddress;
    event ProposalFinalized(uint proposalId, GovernanceStatus status);

    constructor(address _didRegistryAddress) {
        didRegistryAddress = _didRegistryAddress;
    }

    function initiateGovernanceProcess(
        uint proposalId,
        uint proposalIndex,
        address did,
        uint governanceMethodIndex,
        address caller
    ) external {
        GovernanceMethod memory govMethodDetails = IDIDRegistry(didRegistryAddress)
            .getGovernanceMethod(did, governanceMethodIndex);

        require(
            validateGovernanceMethodConfiguration(govMethodDetails),
            "Voting Period Cannot be less than 5 minutes!"
        );

        governanceProcesses[proposalId] = GovernanceProcess({
            governanceStatus: GovernanceStatus.Pending,
            proposalId: proposalId,
            proposalIndex: proposalIndex,
            did: did,
            governanceMethodIndex: governanceMethodIndex,
            requiredYesVotes: (govMethodDetails.controllers.length / 2) + 1,
            requiredNoVotes: (govMethodDetails.controllers.length / 2) + 1,
            yesVotes: 0,
            noVotes: 0,
            controllers: govMethodDetails.controllers,
            startTime: block.timestamp,
            duration: govMethodDetails.intArgs[0]
        });

        proposalCount++;
        //console.log(governanceProcesses[proposalId].requiredYesVotes);
    }

    function finalizeProposal(uint proposalId) public {
        GovernanceProcess storage proposal = governanceProcesses[proposalId];

        require(
            block.timestamp > proposal.startTime + proposal.duration,
            "Voting period has not ended yet"
        );

        require(
            proposal.governanceStatus == GovernanceStatus.Pending,
            "Governance process already finalized"
        );

        if (proposal.yesVotes > proposal.noVotes) {
            proposal.governanceStatus = GovernanceStatus.Approved;

            IDIDRegistry(didRegistryAddress).resolveProposal(
                proposal.proposalId,
                proposal.proposalIndex,
                proposal.did,
                true
            );
        } else {
            proposal.governanceStatus = GovernanceStatus.Rejected;

            IDIDRegistry(didRegistryAddress).resolveProposal(
                proposal.proposalId,
                proposal.proposalIndex,
                proposal.did,
                false
            );
        }

        emit ProposalFinalized(proposalId, proposal.governanceStatus);
    }

    function vote(uint proposalId, bool approve) external {
        GovernanceProcess storage proposal = governanceProcesses[proposalId];

        require(isController(msg.sender, proposalId), "Only controllers can vote");

        require(
            block.timestamp <= proposal.startTime + proposal.duration,
            "Voting period has ended"
        );

        require(
            proposal.governanceStatus == GovernanceStatus.Pending,
            "Governance process already finalized"
        );

        require(!voters[proposalId][msg.sender], "Controller already voted");

        voters[proposalId][msg.sender] = true;

        if (approve) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        if (proposal.yesVotes >= proposal.requiredYesVotes) {
            proposal.governanceStatus = GovernanceStatus.Approved;

            IDIDRegistry(didRegistryAddress).resolveProposal(
                proposal.proposalId,
                proposal.proposalIndex,
                proposal.did,
                true
            );
        } else if (proposal.noVotes >= proposal.requiredNoVotes) {
            proposal.governanceStatus = GovernanceStatus.Rejected;

            IDIDRegistry(didRegistryAddress).resolveProposal(
                proposal.proposalId,
                proposal.proposalIndex,
                proposal.did,
                false
            );
        }
    }

    function isApproved(uint proposalId) external view returns (bool) {
        GovernanceProcess storage proposal = governanceProcesses[proposalId];
        return proposal.governanceStatus == GovernanceStatus.Approved;
    }


    //Chainlink will be calling this function periodically
    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        for (uint i = 0; i < proposalCount; i++) {
            GovernanceProcess storage proposal = governanceProcesses[i];
            if (
                proposal.governanceStatus == GovernanceStatus.Pending &&
                block.timestamp > proposal.startTime + proposal.duration
            ) {
                upkeepNeeded = true;
                performData = abi.encode(i);
                return (upkeepNeeded, performData);
            }
        }
        return (false, bytes(""));
    }

    //If checkUpkeep returns true, Chainlink will call this function, which will then finalize the proposal    
    function performUpkeep(bytes calldata performData) external override {
        uint proposalId = abi.decode(performData, (uint));
        finalizeProposal(proposalId);
    }

    function validateGovernanceMethodConfiguration(
        GovernanceMethod memory governanceMethodConfiguration
    ) public pure override returns (bool) {
        return governanceMethodConfiguration.intArgs[0] >= 300; // At least 5 minutes
    }

    function isController(address account, uint proposalId) public view returns (bool) {
        GovernanceProcess storage proposal = governanceProcesses[proposalId];
        for (uint i = 0; i < proposal.controllers.length; i++) {
            if (proposal.controllers[i] == account) {
                return true;
            }
        }
        return false;
    }
}
