// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "../interfaces/IGovernanceMethod.sol";
import "../interfaces/IDIDRegistry.sol";

// This contract implements simlel IndependentGovernance defined in the DID specification
// ass the DIDregisty already checked if the caller was on the caller list only left thing is to resolve the proposal
contract IndependentGovernance is IGovernanceMethod {
    constructor(address _didRegistryAddress) {
        didRegistryAddress = _didRegistryAddress;
    }

    address public didRegistryAddress;

    function initiateGovernanceProcess(
        uint proposalId,
        uint proposalIndex,
        address did,
        uint governanceMethodIndex,
        address caller
    ) external override {
        require(msg.sender == didRegistryAddress, "Call from unknown contract");
        IDIDRegistry(didRegistryAddress).resolveProposal(
            proposalId,
            proposalIndex,
            did,
            true
        );
    }


    //To satisfy the interface
    function isApproved(uint proposalId) external pure returns (bool) {
        return true;
    }

    function validateGovernanceMethodConfiguration(
        GovernanceMethod calldata governanceMethodConfiguration
    ) external override returns (bool) {
        return true;
    }
}
