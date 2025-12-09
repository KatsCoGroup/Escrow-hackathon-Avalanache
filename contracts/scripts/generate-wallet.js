/**
 * Wallet Generator Script
 * Generates a test wallet with private key for Fuji testnet
 * 
 * Usage: node scripts/generate-wallet.js
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

function generateWallet() {
  console.log("\n🔐 Generating new Avalanche Fuji testnet wallet...\n");

  // Generate random wallet
  const wallet = ethers.Wallet.createRandom();

  const address = wallet.address;
  const privateKey = wallet.privateKey;
  const mnemonic = wallet.mnemonic.phrase;

  console.log("✅ WALLET GENERATED SUCCESSFULLY\n");
  console.log("═══════════════════════════════════════════════════════");
  console.log("📍 ADDRESS (PUBLIC):");
  console.log(`   ${address}`);
  console.log("\n🔑 PRIVATE KEY (KEEP SECRET!):");
  console.log(`   ${privateKey}`);
  console.log("\n📝 MNEMONIC (BACKUP):");
  console.log(`   ${mnemonic}`);
  console.log("═══════════════════════════════════════════════════════\n");

  console.log("⚠️  IMPORTANT SECURITY NOTES:");
  console.log("   1. NEVER share your private key");
  console.log("   2. NEVER commit this to git");
  console.log("   3. Use only on TESTNET (Fuji)");
  console.log("   4. For mainnet, use a hardware wallet\n");

  console.log("📋 NEXT STEPS:");
  console.log("   1. Copy the PRIVATE KEY above");
  console.log("   2. Export as environment variable:");
  console.log(`      export DEPLOYER_PRIVATE_KEY="${privateKey}"`);
  console.log("\n   3. Get test AVAX from faucet:");
  console.log("      https://faucet.avax.network/");
  console.log(`      Paste this address: ${address}\n`);

  console.log("   4. Check faucet status (requires balance):");
  console.log("      curl https://api.avax-test.network/ext/bc/C/rpc");
  console.log("      Method: eth_getBalance");
  console.log(`      Address: ${address}\n`);

  console.log("   5. Create backend/.env:");
  console.log(`      DEPLOYER_PRIVATE_KEY="${privateKey}"`);
  console.log("      AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc");
  console.log("      CHAIN_ID=43113\n");

  // Optionally save to file
  const walletFile = path.join(__dirname, "..", ".wallet.json");
  const walletData = {
    address,
    privateKey,
    mnemonic,
    createdAt: new Date().toISOString(),
    network: "Avalanche Fuji Testnet",
    chainId: 43113,
    note: "⚠️  NEVER commit this file to git!"
  };

  try {
    fs.writeFileSync(walletFile, JSON.stringify(walletData, null, 2));
    console.log(`📁 Wallet saved to: ${walletFile}`);
    console.log("   Add .wallet.json to .gitignore if not already there\n");
  } catch (err) {
    console.warn("⚠️  Could not save wallet file:", err.message);
  }

  return { address, privateKey, mnemonic };
}

// Run
if (require.main === module) {
  try {
    generateWallet();
  } catch (error) {
    console.error("❌ Error generating wallet:", error.message);
    process.exit(1);
  }
}

module.exports = { generateWallet };
