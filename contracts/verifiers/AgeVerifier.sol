pragma solidity ^0.8.20;
import "../interfaces/IGovernanceMethod.sol";
import "../interfaces/IDIDRegistry.sol";
import "../interfaces/IDIDRegistryRouter.sol";
import "../utils/Credentials.sol";
import "hardhat/console.sol";

contract AgeVerifier is IGovernanceSystemPart {
    address public didRegistryRouterAddress;

    Credentials private credentials;

    constructor(address _didRegistryRouterAddress, address _credentials) {
        didRegistryRouterAddress = _didRegistryRouterAddress;
        credentials = Credentials(_credentials);
    }

    // Creates an Proposal for Change of the did document and its governanceMethods
    function createProposal(
        // argument needed to call the didREgistry contract
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // new GovernanceMethods that should overrid governanceMethods[did] in case proposal gets Approwed
        // VCs are beeing passed as arrays
        string[] memory _strings,
        uint256[] memory _numbers,
        bool[] memory _bools,
        address[] memory _addresses,
        bytes memory signature,
        address issuer,
        uint verifierIndex
    ) external {
        require(
            credentials.verifyVCSignature(
                issuer,
                _strings,
                _numbers,
                _bools,
                _addresses,
                signature
            ),
            "not valid credentials"
        );
        require(_numbers[0] >= 18, "VC must be at least 18 years old");
        IDIDRegistryRouter(didRegistryRouterAddress).createProposalWithVC(
            did,
            governanceMethodIndex,
            newDIDDocument,
            newGovernanceMethods,
            verifierIndex
        );
    }
}
