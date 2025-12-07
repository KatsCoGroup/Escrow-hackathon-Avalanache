const hre = require("hardhat");

async function main() {
  console.log("Deploying Escrow contract to Avalanche Fuji testnet...");

  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();

  await escrow.waitForDeployment();
  
  const address = await escrow.getAddress();

  console.log("✅ Escrow contract deployed to:", address);
  console.log("\nUpdate your backend/.env file:");
  console.log(`ESCROW_CONTRACT_ADDRESS=${address}`);
  console.log("\nVerify on SnowTrace:");
  console.log(`https://testnet.snowtrace.io/address/${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
