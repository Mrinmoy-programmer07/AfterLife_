const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    const networkName = hre.network.name;
    console.log(`\n🚀 Deploying AfterLife to ${networkName}...\n`);

    const AfterLife = await hre.ethers.getContractFactory("AfterLife");
    const afterLife = await AfterLife.deploy();

    await afterLife.waitForDeployment();

    const address = await afterLife.getAddress();
    console.log(`✅ AfterLife deployed to: ${address}`);

    // Load existing addresses or create new object
    const addressesPath = './contract-addresses.json';
    let addresses = {};

    if (fs.existsSync(addressesPath)) {
        try {
            addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
        } catch (e) {
            console.log('⚠️ Could not parse existing addresses file, creating new one');
        }
    }

    // Add/update this network's address
    addresses[networkName] = {
        address: address,
        deployedAt: new Date().toISOString(),
        chainId: hre.network.config.chainId
    };

    // Save multi-chain addresses file
    fs.writeFileSync(
        addressesPath,
        JSON.stringify(addresses, null, 2)
    );

    console.log(`\n📝 Deployment info saved to contract-addresses.json`);
    console.log(`\n📋 All deployed contracts:`);
    Object.entries(addresses).forEach(([network, info]) => {
        console.log(`   ${network}: ${info.address}`);
    });

    // Also update chainConfig.ts if on a known chain
    const chainConfigPath = './config/chainConfig.ts';
    if (fs.existsSync(chainConfigPath)) {
        console.log(`\n⚡ Remember to update CONTRACT_ADDRESSES in config/chainConfig.ts:`);
        console.log(`   ${networkName}: "${address}"\n`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

