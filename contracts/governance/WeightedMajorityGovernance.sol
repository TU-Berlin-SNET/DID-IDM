// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IGovernanceMethod.sol";
import "../interfaces/IDIDRegistry.sol";
import "../utils/Credentials.sol";

//Proposals are approved/rejected if the total weight of yes/no votes exceeds %50 of the total weight of controllers

contract WeightedMajorityGovernance is IGovernanceMethod {
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
        address[] issuers;
        GovernanceMethodType governanceMethodType;
        uint requiredYesVotes; // requred numbers of votes to reject the propoosal
        uint requiredNoVotes; // requred numbers of votes to reject the propoosal
        uint yesVotes;
        uint noVotes;
        uint[] weights;
    }

    uint public requiredYesVotes; // min number of "yes" votes required for approval, defined by the constructor
    mapping(uint => GovernanceProcess) public governanceProcesses; // Governace processes maping mapping by I
    mapping(uint => mapping(address => bool)) voters;

    address public didRegistryAddress;
    event VoteCast(uint proposalId, address voter, bool approve);
    event GovernaceProcessApproved(uint proposalId);
    Credentials private credentials;

    constructor(address _didRegistryAddress, address _credentials) {
        didRegistryAddress = _didRegistryAddress;
        credentials = Credentials(_credentials);
    }

    function initiateGovernanceProcess(
        uint proposalId,
        uint proposalIndex,
        address did,
        uint governanceMethodIndex,
        address caller
    ) external override {
        GovernanceMethod memory govMethodDetails = IDIDRegistry(
            didRegistryAddress
        ).getGovernanceMethod(did, governanceMethodIndex);

        // Validate configuration before initiating the process
        require(
            validateGovernanceMethodConfiguration(govMethodDetails),
            "Invalid governance method configuration"
        );

        governanceProcesses[proposalId] = GovernanceProcess({
            governanceStatus: GovernanceStatus.Pending,
            proposalId: proposalId,
            proposalIndex: proposalIndex,
            did: did,
            governanceMethodIndex: governanceMethodIndex,
            requiredYesVotes: govMethodDetails.intArgs[
                govMethodDetails.intArgs.length - 1
            ],
            requiredNoVotes: govMethodDetails.intArgs[
                govMethodDetails.intArgs.length - 2
            ],
            yesVotes: 0,
            noVotes: 0,
            controllers: govMethodDetails.controllers,
            issuers: govMethodDetails.issuers,
            governanceMethodType: govMethodDetails.governanceMethodType,
            weights: govMethodDetails.intArgs
        });

        emit GovernaceProcessApproved(proposalId);
    }

    function isController(
        address account,
        uint controllerIndex,
        address[] memory controllers
    ) public pure {
        require(
            controllers.length > controllerIndex,
            "controllerIndex out of controllers array"
        );
        require(
            controllers[controllerIndex] == account,
            "address of the caller must be in controllers array"
        );
    }

    //To retrieve the weight of a controller
    function getControllerWeight(
        uint proposalId,
        uint controllerIndex
    ) public view returns (uint) {
        require(
            governanceProcesses[proposalId].weights.length > controllerIndex,
            "controllerIndex outside of the proposal.weights"
        );
        return governanceProcesses[proposalId].weights[controllerIndex];
    }

    function voteWithController(
        uint proposalId,
        bool approve,
        uint controllerIndex
    ) external {
        GovernanceProcess memory proposal = governanceProcesses[proposalId];
        require(
            proposal.governanceMethodType == GovernanceMethodType.Controllers,
            "GovernanceMethodType must be equel Controllers"
        );
        require(
            proposal.governanceStatus == GovernanceStatus.Pending,
            "GovernanceProcess already approved"
        );
        require(!voters[proposalId][msg.sender], "Controller already voted");
        isController(msg.sender, controllerIndex, proposal.controllers);

        voters[proposalId][msg.sender] = true;
        castVote(
            approve,
            proposalId,
            getControllerWeight(proposalId, controllerIndex)
        );
    }

    function voteWithVC(
        uint proposalId,
        bool approve,
        // VCs are beeing passed as arrays
        string[] memory _strings,
        uint256[] memory _numbers,
        bool[] memory _bools,
        address[] memory _addresses,
        bytes memory signature,
        address issuer,
        uint issuerIndex
    ) external {
        GovernanceProcess memory proposal = governanceProcesses[proposalId];
        require(
            proposal.governanceMethodType == GovernanceMethodType.VC,
            "GovernanceMethodType must be equel VC"
        );
        require(
            proposal.governanceStatus == GovernanceStatus.Pending,
            "GovernanceProcess already approved"
        );
        require(
            proposal.issuers[issuerIndex] == issuer,
            "No such issuer for this governanceProcesses"
        );
        require(
            _addresses[0] == msg.sender,
            "Caller must be the owner of the VC"
        );
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

        require(!voters[proposalId][msg.sender], "VC already voted");
        voters[proposalId][msg.sender] = true;
        castVote(approve, proposalId, _numbers[0]);
    }

    // ownerAddress and msg.sender do not need to be the same
    // still specific token can be used only once
    function voteWithToken(
        uint proposalId,
        bool approve,
        // token arguments
        uint weight,
        address ownerAddress,
        bytes memory signature,
        address issuer,
        uint issuerIndex
    ) external {
        GovernanceProcess memory proposal = governanceProcesses[proposalId];
        require(
            proposal.governanceMethodType == GovernanceMethodType.Token,
            "GovernanceMethodType must be equel Token"
        );
        require(
            proposal.governanceStatus == GovernanceStatus.Pending,
            "GovernanceProcess already approved"
        );
        require(
            proposal.issuers[issuerIndex] == issuer,
            "No such issuer for this governanceProcesses"
        );
        require(
            credentials.recoverTokenSigner(ownerAddress, weight, signature) ==
                proposal.issuers[issuerIndex],
            "not valid token Signature"
        );

        // we need to convert to address becouse of solidity types
        address tokenHash = address(
            uint160(uint256(credentials.hashToken(weight, ownerAddress)))
        );
        require(!voters[proposalId][tokenHash], "Token already voted");
        voters[proposalId][tokenHash] = true;
        castVote(approve, proposalId, weight);
    }

    function voteWithTokenHolder(
        uint proposalId,
        bool approve,
        // token arguments
        uint weight,
        address ownerAddress,
        bytes memory signature,
        address issuer,
        uint issuerIndex
    ) external {
        GovernanceProcess memory proposal = governanceProcesses[proposalId];
        require(
            proposal.governanceMethodType == GovernanceMethodType.TokenHolder,
            "GovernanceMethodType must be equel TokenHolder"
        );
        require(
            proposal.governanceStatus == GovernanceStatus.Pending,
            "GovernanceProcess already approved"
        );
        require(
            proposal.issuers[issuerIndex] == issuer,
            "No such issuer for this governanceProcesses"
        );
        require(
            ownerAddress == msg.sender,
            "Caller mustbe the owner of the Token"
        );
        require(
            credentials.recoverTokenSigner(ownerAddress, weight, signature) ==
                proposal.issuers[issuerIndex],
            "not valid token Signature"
        );

        require(!voters[proposalId][msg.sender], "Token owner already voted");
        voters[proposalId][msg.sender] = true;
        castVote(approve, proposalId, weight);
    }

    function castVote(bool approve, uint proposalId, uint wheight) internal {
        if (approve) {
            governanceProcesses[proposalId].yesVotes += wheight;
        } else {
            governanceProcesses[proposalId].noVotes += wheight;
        }

        if (
            governanceProcesses[proposalId].yesVotes >=
            governanceProcesses[proposalId].requiredYesVotes
        ) {
            governanceProcesses[proposalId].governanceStatus = GovernanceStatus
                .Approved;
            IDIDRegistry(didRegistryAddress).resolveProposal(
                governanceProcesses[proposalId].proposalId,
                governanceProcesses[proposalId].proposalIndex,
                governanceProcesses[proposalId].did,
                true
            );

            emit GovernaceProcessApproved(proposalId);
        } else if (
            governanceProcesses[proposalId].noVotes >=
            governanceProcesses[proposalId].requiredNoVotes
        ) {
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

    function isApproved(uint proposalId) external view returns (bool) {
        GovernanceProcess storage proposal = governanceProcesses[proposalId];
        return proposal.governanceStatus == GovernanceStatus.Approved;
    }

    function validateGovernanceMethodConfiguration(
        GovernanceMethod memory governanceMethodConfiguration
    ) public pure override returns (bool) {
        return
            governanceMethodConfiguration.intArgs.length ==
            governanceMethodConfiguration.controllers.length + 2;
    }
}
