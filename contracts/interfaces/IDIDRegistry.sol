// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IGovernanceSystemPart.sol";

interface IDIDRegistry is IGovernanceSystemPart {
    function resolveProposal(
        uint proposalId,
        uint proposalIndex,
        address did,
        bool approved
    ) external;

    function getProposal(
        address did,
        uint proposalIndex
    ) external view returns (Proposal memory);

    function getGovernanceMethods(
        address did
    ) external view returns (GovernanceMethod[] memory);

    function getGovernanceMethod(
        address did,
        uint governanceMethodIndex
    ) external view returns (GovernanceMethod memory);

    // this function can be called only from router contract that is specified unted routerAddress var
    function createProposal(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // new GovernanceMethods that should overrid governanceMethods[did] in case proposal gets Approwed
        address caller // address of controller that called for the change of the didDocument
    ) external;
}
