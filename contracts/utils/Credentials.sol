// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

contract Credentials {
    function getEthSignedMessageHash(
        bytes32 _messageHash
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    // recovers sighner of the messgaeHash
    function recoverSigner(
        bytes32 messageHash,
        bytes memory signature
    ) public pure returns (address valid) {
        // 1) Compute the hash of the credentials:
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        (address signer, , ) = ECDSA.tryRecover(
            ethSignedMessageHash,
            signature
        );
        return signer;
    }

    // recovers sighner of the VC based on the signature
    function recoverVCSigner(
        string[] memory _strings,
        uint256[] memory _numbers,
        bool[] memory _bools,
        address[] memory _addresses,
        bytes memory signature
    ) public pure returns (address valid) {
        bytes32 messageHash = keccak256(
            abi.encode(_strings, _numbers, _bools, _addresses)
        );
        return recoverSigner(messageHash, signature);
    }

    // verifies if the vc was signed by the _signer
    function verifyVCSignature(
        address _signer,
        string[] memory _strings,
        uint256[] memory _numbers,
        bool[] memory _bools,
        address[] memory _addresses,
        bytes memory signature
    ) public pure returns (bool valid) {
        address vcSigner = recoverVCSigner(
            _strings,
            _numbers,
            _bools,
            _addresses,
            signature
        );
        valid = vcSigner == _signer;
        return valid;
    }

    // recovers sighner of the token based on the signature
    function recoverTokenSigner(
        address tokenOwner,
        uint tokenIntArg,
        bytes memory signature
    ) public pure returns (address valid) {
        bytes32 messageHash = keccak256(abi.encode(tokenOwner, tokenIntArg));
        return recoverSigner(messageHash, signature);
    }

    // recovers sighner of the token based on the signature
    function recoverTokenSigner(
        address token,
        bytes memory signature
    ) public pure returns (address valid) {
        bytes32 messageHash = keccak256(abi.encode(token));
        return recoverSigner(messageHash, signature);
    }

    // recovers sighner of the token based on the signature
    function recoverTokenSigner(
        string memory token,
        bytes memory signature
    ) public pure returns (address valid) {
        bytes32 messageHash = keccak256(abi.encode(token));
        return recoverSigner(messageHash, signature);
    }

    // verifies if the token was signed by the _signer
    function verifyTokenSignature(
        address _signer,
        string memory token,
        bytes memory signature
    ) public pure returns (bool valid) {
        address tokenSigner = recoverTokenSigner(token, signature);
        return tokenSigner == _signer;
    }

    //

    function hashCredentials(
        string[] memory _strings,
        uint256[] memory _numbers,
        bool[] memory _bools,
        address[] memory _addresses
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(_strings, _numbers, _bools, _addresses));
    }

    function hashToken(
        uint _number,
        address _address
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(_number, _address));
    }

    // OLD CODE CAN BE likelly deleted
    //
    // function splitSignature(
    //     bytes memory signature
    // ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
    //     require(signature.length == 65, "Invalid signature length");
    //     assembly {
    //         r := mload(add(signature, 32))
    //         s := mload(add(signature, 64))
    //         v := byte(0, mload(add(signature, 96)))
    //     }
    // }
    // function verifySignature2(
    //     address _signer,
    //     string[] memory _strings,
    //     uint256[] memory _numbers,
    //     bool[] memory _bools,
    //     address[] memory _addresses,
    //     bytes memory signature
    // ) public pure returns (address valid) {
    //     // 1) Compute the hash of the credentials:
    //     bytes32 messageHash = keccak256(
    //         abi.encode(_strings, _numbers, _bools, _addresses)
    //     );
    //
    //     address recoveredAddress = recoverSigner(messageHash, signature);
    //     return recoveredAddress;
    // }
}
