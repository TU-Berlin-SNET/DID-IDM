// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "../interfaces/IGovernanceMethod.sol";
import "../interfaces/IDIDRegistry.sol";

//Simple governance method with a counter where controllers can vote Yes or No, and the proposal is executed if the specified number of Yes votes is reached

contract NofMGovernance is IGovernanceMethod {
    enum GovernanceStatus {
        Pending,
        Approved
    }
    struct GovernanceProcess {
        GovernanceStatus governanceStatus;
        uint proposalId;
        uint proposalIndex;
        address did;
        uint governanceMethodIndex;
        address caller;
        uint treashold;
        address[] controllers;
        uint votesCount;
        bool approved;
    }

    address public didRegistryAddress;
    mapping(uint => GovernanceProcess) public governanceProcesses; // GovernanceMethods mapped by  PropossalID of proposals for witch the governanceProcesses was created

    constructor(address _didRegistryAddress) {
        didRegistryAddress = _didRegistryAddress;
    }

    function initiateGovernanceProcess(
        uint proposalId,
        uint proposalIndex,
        address did,
        uint governanceMethodIndex,
        address caller
    ) external override {
        require(msg.sender == didRegistryAddress, "Call from unknown contract");

        GovernanceMethod memory govMethodDetails = IDIDRegistry(
            didRegistryAddress
        ).getGovernanceMethod(did, governanceMethodIndex);

        // TODO: some checks of the governnace Metrhod Configuration need to be performed here
        // in case of this contact first inArg musst be checked if it is correct
        // TODO: !! mechanism for handling invalid governanceMethod configuration need to be disscuesed
        // simplest one would be rejecting the proposal if the arguments would not follow requirements

        governanceProcesses[proposalId] = GovernanceProcess({
            governanceStatus: GovernanceStatus.Pending,
            proposalId: proposalId,
            proposalIndex: proposalIndex,
            did: did,
            governanceMethodIndex: governanceMethodIndex,
            caller: caller,
            treashold: govMethodDetails.intArgs[0],
            controllers: govMethodDetails.controllers,
            votesCount: 0,
            approved: false
        });
    }

    function vote(uint proposalId, uint controllerIndex) external {
        require(
            msg.sender ==
                governanceProcesses[proposalId].controllers[controllerIndex],
            "Only controllers can vote."
        );
        // TODO: Check if governanceProcess exists

        governanceProcesses[proposalId].votesCount++;

        // in case we arrived at the treashold the propsal should be resolved to accepted
        if (
            governanceProcesses[proposalId].votesCount >=
            governanceProcesses[proposalId].treashold
        ) {
            IDIDRegistry(didRegistryAddress).resolveProposal(
                governanceProcesses[proposalId].proposalId,
                governanceProcesses[proposalId].proposalIndex,
                governanceProcesses[proposalId].did,
                true
            );

            // TODO: Maybe emiting resolvedGovernance event
            // we do not need the governanceProcesses anymore
            delete governanceProcesses[proposalId];
        }
    }

    function validateGovernanceMethodConfiguration(
        GovernanceMethod calldata governanceMethodConfiguration
    ) external override returns (bool) {
        if (governanceMethodConfiguration.intArgs[0] > 0) {
            return (true);
        } else {
            return false;
        }
    }
    function isApproved(uint proposalId) external view returns (bool) {
        GovernanceProcess storage proposal = governanceProcesses[proposalId];
        return proposal.approved;
    }
}
