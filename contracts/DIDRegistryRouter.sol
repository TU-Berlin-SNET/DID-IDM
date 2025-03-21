// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IGovernanceMethod.sol";
import "./interfaces/IDIDRegistryRouter.sol";
import "./interfaces/IDIDRegistry.sol";
import "./utils/Credentials.sol";
import "hardhat/console.sol";

contract DIDRegistryRouter is IDIDRegistryRouter {
    Credentials private credentials;

    address public didRegistryAddress;

    constructor(address _didRegistryAddress, address _credentials) {
        didRegistryAddress = _didRegistryAddress;
        credentials = Credentials(_credentials);
    }

    function createProposalWithVC(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // new GovernanceMethods that should overrid governanceMethod[did] in case proposal gets Approwed
        uint verifierIndex // index of the verirfer in the verirfeir array of this mehtods
    ) external {
        GovernanceMethod memory governanceMethod = IDIDRegistry(
            didRegistryAddress
        ).getGovernanceMethod(did, governanceMethodIndex);
        onlyVerifier(governanceMethod, verifierIndex);

        IDIDRegistry(didRegistryAddress).createProposal(
            did,
            governanceMethodIndex,
            newDIDDocument,
            newGovernanceMethods,
            msg.sender
        );
    }

    function createProposalWithToken(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // new GovernanceMethods that should overrid governanceMethod[did] in case proposal gets Approwed
        uint issuerIndex, //  index of the issuer that issued this tokein
        string memory token,
        bytes memory signature
    ) external {
        GovernanceMethod memory governanceMethod = IDIDRegistry(
            didRegistryAddress
        ).getGovernanceMethod(did, governanceMethodIndex);
        onlyWithToken(governanceMethod, issuerIndex, token, signature);
        IDIDRegistry(didRegistryAddress).createProposal(
            did,
            governanceMethodIndex,
            newDIDDocument,
            newGovernanceMethods,
            msg.sender
        );
    }

    function createProposalWithTokenHolder(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // new GovernanceMethods that should overrid governanceMethod[did] in case proposal gets Approwed
        uint issuerIndex, //  index of the issuer that issued this tokein
        address token,
        bytes memory signature
    ) external {
        GovernanceMethod memory governanceMethod = IDIDRegistry(
            didRegistryAddress
        ).getGovernanceMethod(did, governanceMethodIndex);
        onlyTokenHolder(governanceMethod, issuerIndex, token, signature);

        IDIDRegistry(didRegistryAddress).createProposal(
            did,
            governanceMethodIndex,
            newDIDDocument,
            newGovernanceMethods,
            msg.sender
        );
    }

    // old createProposal
    function createProposalWithControllers(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        uint callerIndex, // caller index in the controllers array of the governanceMethod[did][governanceMethodIndex].
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods // new GovernanceMethods that should overrid governanceMethod[did] in case proposal gets Approwed
    ) external {
        GovernanceMethod memory governanceMethod = IDIDRegistry(
            didRegistryAddress
        ).getGovernanceMethod(did, governanceMethodIndex);
        onlyController(governanceMethod, callerIndex);
        IDIDRegistry(didRegistryAddress).createProposal(
            did,
            governanceMethodIndex,
            newDIDDocument,
            newGovernanceMethods,
            msg.sender
        );
    }

    function onlyController(
        GovernanceMethod memory governanceMethod,
        uint callerIndex
    ) public view {
        // ensure the callerIndex is correct
        require(
            governanceMethod.controllers.length > callerIndex,
            "Invalid caller index"
        );
        // caller needs to be an controller in the specified governanceMethod
        require(
            governanceMethod.controllers[callerIndex] == msg.sender,
            "Only users listed as controller can performe this action"
        );
    }

    function onlyVerifier(
        GovernanceMethod memory governanceMethod,
        uint verifierIndex
    ) public view {
        verifyGovType(governanceMethod, GovernanceMethodType.VC);
        // ensure the governance method exists
        // ensure the callerIndex is correct
        require(
            governanceMethod.verifierContracts.length > verifierIndex,
            "Invalid caller index"
        );
        // caller must be listed in verifer list in the specified governanceMethod
        require(
            governanceMethod.verifierContracts[verifierIndex] == msg.sender,
            "Only contracts listed as verifierContracts can performe this action"
        );
    }

    function onlyWithToken(
        GovernanceMethod memory governanceMethod,
        uint issuerIndex,
        string memory token,
        bytes memory signature
    ) public view {
        verifyGovType(governanceMethod, GovernanceMethodType.Token);
        // ensure the callerIndex is correct
        require(
            governanceMethod.issuers.length > issuerIndex,
            "Invalid caller index"
        );

        // caller must be listed in verifer list in the specified governanceMethod

        require(
            credentials.recoverTokenSigner(token, signature) ==
                governanceMethod.issuers[issuerIndex],
            "not correct issuer"
        );
    }

    function onlyTokenHolder(
        GovernanceMethod memory governanceMethod,
        uint issuerIndex,
        address token,
        bytes memory signature
    ) public view {
        verifyGovType(governanceMethod, GovernanceMethodType.TokenHolder);
        // ensure the callerIndex is correct
        require(
            governanceMethod.issuers.length > issuerIndex,
            "Invalid caller index"
        );
        // caller must be listed in verifer list in the specified governanceMethod
        require(
            credentials.recoverTokenSigner(token, signature) ==
                governanceMethod.issuers[issuerIndex],
            "not valid signature"
        );
        require(msg.sender == token, "caller must be equel to the token owner");
        // TODO: validatet  that token == caller.address,
        // we will have to use address token instead of the string
        // this will require an extra method in credentila utils
    }

    function verifyGovType(
        GovernanceMethod memory governanceMethod,
        GovernanceMethodType requiredType
    ) public pure {
        require(
            governanceMethod.governanceMethodType == requiredType,
            "Invaild governanceMethodType"
        );
    }
}
