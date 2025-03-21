// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IGovernanceSystemPart.sol";

interface IGovernanceMethod is IGovernanceSystemPart {
    // NOTE: Interface for the GovernanceMethods is preaty minimal
    // Governance method needs just to allow to initiateGovernanceProcess by the DIDregistyy
    // Logic for compliting of the GovernanceMethod can be fully custome
    // Only other thing that all GovernanceMethodContacts will have in comen is the call to resolveProposa() method of DIDregisty when
    // the GovernanceProcess is done

    // gets called from DID regestry contract to start governence process defined by the GovernanceMethod object
    function initiateGovernanceProcess(
        uint proposalId,
        uint proposalIndex,
        address did,
        uint governanceMethodIndex,
        address caller
    ) external;

    // every GovernanceMethodContract should implement method that checks validity of the GovernanceMethod governanceMethodConfiguration
    // this will be stuff like correct argument on correct indexes etc
    // this is more itendet for the controllers that want to make sure that the new configurtation has correct
    function validateGovernanceMethodConfiguration(
        GovernanceMethod calldata governanceMethodConfiguration
    ) external returns (bool);

    // NOTE: after  the governence process is done GovernanceMethodCOntract should call resolveProposal on the DIDregistry contract
    // this method calls the executProposal methods on the regestry contract to finilize the propsal
    // i am leaving it here for now
    // function resolveGovernanceProcess(uint proposalId) internal;

    //NOTE: this might not be needed as the DIDregistry will documnet the status of proposals
    // custome getters can be implemented on the contract
    // function isApproved(uint proposalId) external view returns (bool);

    // method for casting of the vote by the controllers
    // NOTE: in some cases vot method might not be needed therefore i comented it out
    // function vote(uint proposalId, bool approve) external;

    // NOTE: not sure if we need it as interface as just by initiateGovernanceProcess we start executing it
    //function execute(uint proposalId) external;
}
