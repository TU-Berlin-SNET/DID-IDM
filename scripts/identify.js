const hre = require("hardhat");

//not useful right now

async function main() {
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const contract = await hre.ethers.getContractAt("EthereumDIDRegistry", contractAddress);

  const accounts = await hre.ethers.getSigners();


 const tx = await contract.identityOwner("0x14791697260E4c9A71f18484C9f997B308e59325");
  console.log(tx);
  console.log("done");

  const tx2 = await contract.changeOwner("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x14791697260E4c9A71f18484C9f997B308e59325"  );

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });