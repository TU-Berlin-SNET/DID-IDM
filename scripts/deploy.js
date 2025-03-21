async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
 
    //const Governance = await ethers.getContractFactory("Governance");
    //const EthereumDIDRegistry = await ethers.getContractFactory("EthereumDIDRegistry");
    const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
    const TimeLimitedGovernance = await ethers.getContractFactory("TimeLimitedGovernance");

    //const governance = await Governance.deploy(deployer.address);
    //const ethereumDIDRegistry = await EthereumDIDRegistry.deploy();
    const didRegistry = await DIDRegistry.deploy();
    const timeLimitedGovernance = await TimeLimitedGovernance.deploy(didRegistry.target);
 

    //await ethereumDIDRegistry.waitForDeployment();
    await didRegistry.waitForDeployment();
    console.log("DID Registry contract deployed to:", didRegistry.target);

    await timeLimitedGovernance.waitForDeployment();
    console.log("Time Limited Governance contract deployed to:", timeLimitedGovernance.target);
 }
    
 
 main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
 