// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IGovernanceSystemPart.sol";

interface IDIDRegistryRouter is IGovernanceSystemPart {
    function createProposalWithVC(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // new GovernanceMethods that should overrid governanceMethods[did] in case proposal gets Approwed
        uint verifierIndex // verifierIndex
    ) external;

    function createProposalWithToken(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // new GovernanceMethods that should overrid governanceMethods[did] in case proposal gets Approwed
        uint issuerIndex, //  index of the issuer that issued this tokein
        string memory token,
        bytes memory signature
    ) external;

    function createProposalWithTokenHolder(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // new GovernanceMethods that should overrid governanceMethods[did] in case proposal gets Approwed
        uint issuerIndex, //  index of the issuer that issued this tokein
        address token,
        bytes memory signature
    ) external;

    function createProposalWithControllers(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        uint callerIndex, // caller index in the controllers array of the governanceMethods[did][governanceMethodIndex].
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods // new GovernanceMethods that should overrid governanceMethods[did] in case proposal gets Approwed
    ) external;
}
