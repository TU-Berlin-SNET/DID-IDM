const hre = require("hardhat");

async function main() {
    const [deployer, controller1, controller2, controller3] = await hre.ethers.getSigners();

    const CounterLogicGovernance = await hre.ethers.getContractFactory("CounterLogicGovernance");
    const governance = await CounterLogicGovernance.deploy(
        [controller1.address, controller2.address, controller3.address],
        2 // required "yes" votes for approval as example
    );
    await governance.waitForDeployment();

    console.log(`CounterLogicGovernance deployed to: ${governance.target}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
