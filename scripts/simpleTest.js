const hre = require("hardhat");

async function main() {
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; //Update this when trying!!
    const DIDRegistry = await hre.ethers.getContractAt("DIDRegistry", contractAddress);

    const [owner, otherAccount] = await hre.ethers.getSigners();

    console.log("Testing with owner address:", owner.address);

    // Create a DID Document
    console.log("Creating DID Document...");
    const createTx = await DIDRegistry.connect(owner).createDIDDocument(
        "publicKeyExample",
        "authenticationMethodExample"
    );
    await createTx.wait();
    console.log("DID Document created.");

    // log the DID Document
    const didDocument = await DIDRegistry.didDocuments(owner.address);
    console.log("Fetched DID Document:", didDocument);

    // Update the DID Document

    console.log("Updating DID Document...");
    const updateTx = await DIDRegistry.connect(owner).updateDIDDocument(
        "newPublicKeyExample",
        "newAuthenticationMethodExample"
    );
    await updateTx.wait();
    console.log("DID Document updated.");

    // log the updated DID Document
    const updatedDidDocument = await DIDRegistry.didDocuments(owner.address);
    console.log("Updated DID Document:", updatedDidDocument);

    // Test unauthorized case
    console.log("Attempting unauthorized update...");
    try {
        const unauthorizedUpdateTx = await DIDRegistry.connect(otherAccount).updateDIDDocument(
            "unauthorizedKey",
            "unauthorizedAuthMethod"
        );
        await unauthorizedUpdateTx.wait();
    } catch (error) {
        console.error("Unauthorized update attempt failed as expected:", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
