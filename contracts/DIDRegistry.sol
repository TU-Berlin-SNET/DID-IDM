/* SPDX-License-Identifier: MIT */

pragma solidity ^0.8.20;

import "./interfaces/IGovernanceMethod.sol";
import "./interfaces/IDIDRegistry.sol";

contract DIDRegistry is IDIDRegistry {
    mapping(address => GovernanceMethod[]) public governanceMethods; // stores all governanceMethods for each did
    mapping(address => DIDDocument) public didDocuments; // stores did documents for each did
    mapping(address => Proposal[]) public proposals; // mapps from did to all pending proposals for the did document
    mapping(address => GovernanceMethod[][]) public proposedGovernanceMethods; // maps from DID to array of proposed GovernanceMetrhods arrays for each proposals. proposedGovernanceMethods[did][proposalIndex] => array of new GovernanceMethods that were proposed inside of the proposal.
    //mapping(address => uint[]) public proposalsIds; // mapps from dodcumte did to all pending proposals ids. NOTE we need this as solidity does not allow iterating over mappings :(. Maybe not needed
    uint public proposalCount; // used for creation of uiniqe id for each proposal

    event DIDDocumentCreated(address indexed did, address indexed owner);
    event DIDDocumentUpdated(address indexed did, uint indexed proposalId);
    event ProposalCreated(uint indexed proposalId, address indexed did);
    event ProposalExecuted(uint indexed proposalId, Proposal executedProposal);

    // checks if the caller is dfeined as controller in the governance metrhod
    // Creates new did document with owner equel to msg.sender and prowided arguments
    address public routerAddress;

    // unfortantly we need to store somehow the address of the router contract
    // for this here does not have any authorization
    // TODO: disscuesse mechanism for setting this address
    function setDIDRegistryRouterAddress(address _routerAddress) external {
        routerAddress = _routerAddress;
    }

    function createDIDDocument(
        string memory publicKey,
        string memory authenticationMethod,
        GovernanceMethod[] memory newGovernanceMethods
    ) external {
        require(bytes(publicKey).length > 0, "Public key is required");
        require(
            bytes(authenticationMethod).length > 0,
            "Authentication method is required"
        );
        require(
            didDocuments[msg.sender].owner == address(0),
            "DID document already exists"
        );
        //TODO: we should probably do more checks on the governanceMethod here like:
        // 1. Controllers array should not be empty
        // 2. address of GovernanceMethod must be provided etc
        // 3. those checks should be seeperate function validGovernanceMethods() that gets called here and returns bool

        // Creation of the DID document
        didDocuments[msg.sender] = DIDDocument({
            owner: msg.sender,
            publicKey: publicKey,
            lastChanged: block.number,
            authenticationMethod: authenticationMethod
        });

        // copying the governanceMethods for the new DIDdocument
        for (uint i = 0; i < newGovernanceMethods.length; i++) {
            governanceMethods[msg.sender].push(newGovernanceMethods[i]);
        }
        emit DIDDocumentCreated(msg.sender, msg.sender);
    }

    function createProposal(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // new GovernanceMethods that should overrid governanceMethods[did] in case proposal gets Approwed
        address caller // address of initial caller
    ) external {
        createProposalIn(
            did,
            governanceMethodIndex,
            newDIDDocument,
            newGovernanceMethods,
            caller
        );
    }

    // Creates an Proposal for Change of the did document and its governanceMethods
    function createProposalIn(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // new GovernanceMethods that should overrid governanceMethods[did] in case proposal gets Approwed
        address caller // address of initial caller
    ) internal {
        // TODO: write on function that checks the validity of the newDIDDocument and call it here. We dont want to allow overriding with invalid did document
        // TODO: did document validation should be extracted to seperate function
        // TODO: Valididate the newGovernanceMethods[] with seperate function
        require(
            msg.sender == routerAddress,
            "Only router contract can call the createProposal"
        );
        require(
            newDIDDocument.owner != address(0),
            "Invalid did document owner!"
        );
        require(
            bytes(newDIDDocument.publicKey).length > 0,
            "Invalid did public key!"
        );
        require(
            bytes(newDIDDocument.authenticationMethod).length > 0,
            "Invalid did authentication method!"
        );
        // get the chosen governanceMethods
        // NOTE: onlyController() already proves if this governance exists and can be used by the caller
        GovernanceMethod memory chosenGovernanceMethod = governanceMethods[did][
            governanceMethodIndex
        ];
        if (
            chosenGovernanceMethod.editRightsLevel ==
            EditRightsLevel.DelegatesCreation
        ) {
            require(
                governanceMethods[did][governanceMethodIndex].editRightsLevel ==
                    EditRightsLevel.DelegatesCreation,
                "Your GovernanceMethod does not have needed EditRightsLevel"
            );
            require(
                newGovernanceMethods[0].editRightsLevel <=
                    EditRightsLevel.DelegatesCreation,
                "You can only downgrade or maintain your EditRightsLevel"
            );

            // iteratign over delegatesGovernanceMethods to check if they have correct EditRightsLevel and to append them to the list of didGovernanceMethods
            for (uint i = 1; i < newGovernanceMethods.length; i++) {
                require(
                    newGovernanceMethods[i].editRightsLevel ==
                        EditRightsLevel.Document,
                    "Deelegates can only have ditRightsLevel==Document"
                );
            }
        }

        require(
            chosenGovernanceMethod.expiresAt > block.timestamp ||
                chosenGovernanceMethod.expiresAt == 0,
            "This governanceMethod already expired"
        );
        require(
            chosenGovernanceMethod.blockedUntil < block.timestamp ||
                chosenGovernanceMethod.blockedUntil == 0,
            "This governanceMethod is still Blocked until certain timestamp"
        );

        uint proposalIndex = proposals[did].length;
        proposals[did].push(
            Proposal({
                did: did,
                newDidDocument: newDIDDocument,
                status: ProposalStatus.Pending,
                governanceMethodIndex: governanceMethodIndex,
                caller: caller,
                id: proposalCount,
                timestamp: block.timestamp
            })
        );

        // NOTE: Because of addition of EditRightsLevels it will be necessary considering an alternative way of storing of the newproposedGovernanceMethods
        // in casse of editRightsLevel All and DelegatesCreation we copy all of the newproposedGovernanceMethods into the proposal, resolveProposal will handle the cases fro all and createDelegates acondingly
        if (
            chosenGovernanceMethod.editRightsLevel <=
            EditRightsLevel.DelegatesCreation
        ) {
            if (proposedGovernanceMethods[did].length <= proposalIndex) {
                proposedGovernanceMethods[did].push(); // we need to first initite the array
            }
            for (uint i = 0; i < newGovernanceMethods.length; i++) {
                proposedGovernanceMethods[did][proposalIndex].push(
                    newGovernanceMethods[i]
                ); // copying the newgovernanceMethods into proposedGovernanceMethods array
            }
            // if editRightsLevel == SelfGovenance we only update the governanceMethod of the caler, here we need to make sure that he does not
            // overrids the EditRightsLevel in his governanceMethod
            // we also expect the caller to pass only one governanceMethod in the array
        } else if (
            chosenGovernanceMethod.editRightsLevel ==
            EditRightsLevel.SelfGovernance
        ) {
            require(
                newGovernanceMethods[0].editRightsLevel ==
                    EditRightsLevel.SelfGovernance,
                "You can not change the EditRightsLevel if you have EditRightsLevel==SeflGovernance"
            );
            require(
                newGovernanceMethods.length == 1,
                "You need to provide only one governanceMethod if you EditRightsLevel == SelfGovernance"
            );
            proposedGovernanceMethods[did].push();
            proposedGovernanceMethods[did][proposalIndex].push(
                newGovernanceMethods[0]
            );
            // case where EditRightsLevel == Documnt. Here we do not allow for overriding of any GovernanceMethod. Therefore user should not provide any new governanceMethods
        } else {
            require(
                newGovernanceMethods.length == 0,
                "You are not allow to provide any new governanceMethods as yur EditRightsLevel==Document"
            );
            // still we need to initate a new array of propposed GovernanceMethod otherwise we will lose the  correct inedxing of propposedGovernance methods
            proposedGovernanceMethods[did].push();
        }

        // call to the GovernanceMethodContract initiating the GovernanceProcess
        // GovernanceMethodContract deals with the whole GovernanceProcess and when its done it will call resolveProposal() on the DIDregisty
        IGovernanceMethod(chosenGovernanceMethod.contractAddres)
            .initiateGovernanceProcess(
                proposalCount, // unique id of proposa
                proposalIndex, //  index needed for the retirvel of the proposal <= proposals[did][proposalIndex]
                did, // did for witch the proposal was createed
                governanceMethodIndex,
                msg.sender
            );
        emit ProposalCreated(proposalCount, did);
        proposalCount++;
    }

    function createDelegates(
        address did, // did of document that should be changed
        uint governanceMethodIndex, // specifies tha governancMethods that should be used in the GovernanceProcess for this Proposal
        DIDDocument memory newDIDDocument, // new did document that should overwrite the old one
        GovernanceMethod[] memory newGovernanceMethods, // first gove methods must be own GovernanceMethod, the rest of the methods are the newDelegates methods
        address caller
    ) external {
        //TODO:
        // 1. Check if newGovernanceMethods[0] did not change the EditRightsLevel
        // 2.copy  current governnace metrhods for the did
        // 2. Check if all other newGovernanceMethods have corret EidtRightsLevel
        // 4  change the used GocveMethods
        // 5 append the new goveMethods to the copy
        // 3. Call CreateProposal
        require(
            governanceMethods[did][governanceMethodIndex].editRightsLevel ==
                EditRightsLevel.DelegatesCreation,
            "Your GovernanceMethod does not have needed EditRightsLevel"
        );
        require(
            newGovernanceMethods[0].editRightsLevel <=
                EditRightsLevel.DelegatesCreation,
            "You can only downgrade or maintain your EditRightsLevel"
        );

        // iteratign over delegatesGovernanceMethods to check if they have correct EditRightsLevel and to append them to the list of didGovernanceMethods
        for (uint i = 1; i < newGovernanceMethods.length; i++) {
            require(
                newGovernanceMethods[i].editRightsLevel ==
                    EditRightsLevel.Document,
                "Deelegates can only have ditRightsLevel==Document"
            );
        }

        createProposalIn(
            did,
            governanceMethodIndex,
            newDIDDocument,
            newGovernanceMethods,
            caller
        );
    }

    // metrhod for resolving of the proposal. It is supposed to be called from GovernanceMethodContract when the  Governance process is complit
    function resolveProposal(
        uint proposalId,
        uint proposalIndex,
        address did,
        bool approved
    ) external override {
        Proposal memory proposal = proposals[did][proposalIndex];
        require(proposal.id == proposalId, "Proposal ids must match");
        require(
            proposal.status == ProposalStatus.Pending,
            "Proposal already executed"
        );

        // DIDDocument memory oldDIDDocumnt = didDocuments[proposal.did];
        GovernanceMethod memory usedGovernanceMethod = governanceMethods[
            proposal.did
        ][proposal.governanceMethodIndex];

        // checking if the caller has the correct address
        // NOTE:
        // 1.this assumes that the governanceContract at the address msg.sender can not be changed
        // 2. governanceContract deals with the whole governance process, if the users added DID document that refrences to the certain governanceMethod contacts than
        // than it his resposibility to make sure that the governenac on that contact works porperly
        // did registry only waits for the call from this governanceContract that the governance Process is done
        // therefore it is enought to check only the address of the caller here
        require(
            msg.sender == usedGovernanceMethod.contractAddres,
            "Not correct GovernanceMethodContract address"
        );

        // we need to check if the usedGovernanceMethod did not expired during the whole governanceProcess in this case this propsal should automaticly be rejected.
        if (
            approved &&
            (usedGovernanceMethod.expiresAt > block.timestamp ||
                usedGovernanceMethod.expiresAt == 0)
        ) {
            // If porposal was approwed we execute it!

            // First we set its status to Approwd and we delete all othre proposals
            proposal.status = ProposalStatus.Approved;
            // NOTE: now all other proposals that were started for this did are not valid anymore(as we overrite the whole did document we also likely make changes to the GovernanceMethods avaiable for this did) therefore we must resolve them
            resolveUnvalidProposals(did, proposal);

            // Apply the update to the diddocumet
            didDocuments[proposal.did] = proposal.newDidDocument;

            // in case where editRightsLevel == All we copy all new GovernanceMetrhods that were provided during Proposal createion
            if (usedGovernanceMethod.editRightsLevel == EditRightsLevel.All) {
                // Delete old governanceMetrhods of the did
                delete governanceMethods[did];
                for (
                    uint i = 0;
                    i < proposedGovernanceMethods[did][proposalIndex].length;
                    i++
                ) {
                    governanceMethods[did].push(
                        proposedGovernanceMethods[did][proposalIndex][i]
                    );
                }
                // in case where editRightsLevel == SelfGovenance we only update the governancemethods that was used
            } else if (
                usedGovernanceMethod.editRightsLevel ==
                EditRightsLevel.DelegatesCreation
            ) {
                governanceMethods[did][
                    proposal.governanceMethodIndex
                ] = proposedGovernanceMethods[did][proposalIndex][0];
                for (
                    uint i = 1;
                    i < proposedGovernanceMethods[did][proposalIndex].length;
                    i++
                ) {
                    governanceMethods[did].push(
                        proposedGovernanceMethods[did][proposalIndex][i]
                    );
                }
            }
            // in case where editRightsLevel == SelfGovenance we only update the governancemethods that was used
            else if (
                usedGovernanceMethod.editRightsLevel ==
                EditRightsLevel.SelfGovernance
            ) {
                governanceMethods[did][
                    proposal.governanceMethodIndex
                ] = proposedGovernanceMethods[did][proposalIndex][0];
            }
            // in case where EidtRights == Document we do not update any governanceMethods so we are done
            // NOTE: it should be disscuessed if all other proposal do become unvalid in such scenario, in current implementation they do

            // we do not need the old preposed methods as their propposals became unvalid
            delete proposedGovernanceMethods[did];
            // ass all proposals for the did address got resolved we can delete the whole array of those propossals from the contract
            delete proposals[did];
        } else {
            //Note: if the proposal was rejected than we do not need to do anything with all other proposals
            proposal.status = ProposalStatus.Rejected;
            // stiil we delete this proposal from the proposals array as we allow resoliving an proposal only once.
            delete proposals[did][proposalIndex];
        }
        emit DIDDocumentUpdated(proposal.did, proposalId);
        emit ProposalExecuted(proposalId, proposal);
    }

    // gets did for witch all other proposals than the validProposal should be resolved to rejected and deleted from the proosals array
    // should be called after some proposals gets executed as Approved
    function resolveUnvalidProposals(
        address did,
        Proposal memory validProposal
    ) internal {
        Proposal[] memory pendingProposals = proposals[did];
        for (uint i = 0; i < pendingProposals.length; i++) {
            // we performe this actions for all other proposal than the validProposal
            if (pendingProposals[i].id != validProposal.id) {
                Proposal memory unvalidProposal = pendingProposals[i];
                unvalidProposal.status = ProposalStatus.Rejected;
                // emiting the event
                emit ProposalExecuted(
                    pendingProposals[i].id,
                    pendingProposals[i]
                );
                delete proposals[did][i];
            }
        }
    }

    //#################### Getter methods #####################################

    // get all governanceMethods for the specified did
    function getGovernanceMethods(
        address did
    ) public view returns (GovernanceMethod[] memory) {
        return governanceMethods[did];
    }

    function getGovernanceMethod(
        address did,
        uint governanceMethodIndex
    ) public view returns (GovernanceMethod memory) {
        require(
            governanceMethods[did].length > governanceMethodIndex,
            "Invalid governance method index"
        );
        return governanceMethods[did][governanceMethodIndex];
    }

    // get all pending proposals for the did
    function getProposals(address did) public view returns (Proposal[] memory) {
        return proposals[did];
    }

    // get pending proposal for did document with ProposalIndex
    function getProposal(
        address did,
        uint proposalIndex
    ) public view returns (Proposal memory) {
        return proposals[did][proposalIndex];
    }

    // return s number of proposals that are pending for the did documnet
    function getProposalCount(address did) public view returns (uint) {
        return proposals[did].length;
    }

    //DEBUGGING FOR ONLYCONTROLLER MODIFIER
    function getController(
        address did,
        uint governanceMethodIndex,
        uint callerIndex
    ) public view returns (address) {
        require(
            governanceMethods[did].length > governanceMethodIndex,
            "Invalid governance method index"
        );
        require(
            governanceMethods[did][governanceMethodIndex].controllers.length >
                callerIndex,
            "Invalid caller index"
        );
        return
            governanceMethods[did][governanceMethodIndex].controllers[
                callerIndex
            ];
    }
}
