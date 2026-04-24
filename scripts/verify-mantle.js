const hre = require("hardhat");

async function main() {
    console.log("Verifying contract on Mantle Sepolia...\n");

    const contractAddress = "0x8fD3A16F905dF98907B3739bCD0E31a7949cd2D2";

    // Get the provider for the network
    const provider = hre.ethers.provider;

    // Check if contract has code
    const code = await provider.getCode(contractAddress);
    console.log("Contract bytecode length:", code.length, "chars");
    console.log("Has bytecode:", code !== "0x");

    if (code === "0x") {
        console.log("\n❌ ERROR: No contract found at this address on Mantle Sepolia!");
        console.log("The contract may not have been deployed successfully.");
        return;
    }

    console.log("\n✅ Contract exists on chain!\n");

    // Try to read some view functions
    const AfterLife = await hre.ethers.getContractFactory("AfterLife");
    const contract = AfterLife.attach(contractAddress);

    // Try reading MIN_THRESHOLD constant 
    try {
        const minThreshold = await contract.MIN_THRESHOLD();
        console.log("MIN_THRESHOLD:", minThreshold.toString(), "seconds");
    } catch (e) {
        console.log("Error reading MIN_THRESHOLD:", e.message);
    }

    // Try reading PLATFORM_WALLET constant
    try {
        const platformWallet = await contract.PLATFORM_WALLET();
        console.log("PLATFORM_WALLET:", platformWallet);
    } catch (e) {
        console.log("Error reading PLATFORM_WALLET:", e.message);
    }

    // Check if user is already registered
    const signers = await hre.ethers.getSigners();
    const userAddress = signers[0].address;
    console.log("\nChecking registration for:", userAddress);

    try {
        const isOwner = await contract.isOwner(userAddress);
        console.log("Is already registered:", isOwner);
    } catch (e) {
        console.log("Error checking isOwner:", e.message);
    }

    // Try to simulate register call
    console.log("\nSimulating register(120) call...");
    try {
        await contract.register.staticCall(120);
        console.log("✅ register(120) simulation passed - call would succeed");
    } catch (e) {
        console.log("❌ register(120) simulation failed:");
        console.log("  Reason:", e.reason || e.message);
        if (e.message.includes("AlreadyRegistered")) {
            console.log("\n  → You are already registered on this chain!");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Script error:", error);
        process.exit(1);
    });
