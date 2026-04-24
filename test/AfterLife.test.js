const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AfterLife Protocol", function () {
    let afterLife;
    let owner;
    let guardian;
    let beneficiary;
    let otherAccount;

    // Constants
    const INACTIVITY_THRESHOLD = 30 * 24 * 60 * 60; // 30 Days

    beforeEach(async function () {
        [owner, guardian, beneficiary, otherAccount] = await ethers.getSigners();

        // We get the contract/factory. Hardhat reads artifacts from compilation.
        const AfterLife = await ethers.getContractFactory("AfterLife");
        afterLife = await AfterLife.deploy(INACTIVITY_THRESHOLD);
        // In Hardhat v2, deploy() returns a promise that resolves to the contract instance (or transaction)
        // For some versions we need .waitForDeployment() or .deployed()
        // Recent ethers v6: await afterLife.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await afterLife.owner()).to.equal(owner.address);
        });

        it("Should set the correct inactivity threshold", async function () {
            expect(await afterLife.inactivityThreshold()).to.equal(INACTIVITY_THRESHOLD);
        });
    });

    describe("Heartbeat", function () {
        it("Should update lastHeartbeat on proveLife", async function () {
            const initialHeartbeat = await afterLife.lastHeartbeat();

            // Advance time slightly
            await time.increase(100);

            await afterLife.proveLife();
            const newHeartbeat = await afterLife.lastHeartbeat();

            expect(newHeartbeat).to.be.gt(initialHeartbeat);
        });

        it("Should fail if non-owner tries to prove life", async function () {
            await expect(afterLife.connect(guardian).proveLife()).to.be.revertedWith("Not Owner");
        });
    });

    describe("Guardians & Inactivity", function () {
        beforeEach(async function () {
            await afterLife.addGuardian("Guardian1", guardian.address);
        });

        it("Should allow adding a guardian", async function () {
            const g = await afterLife.guardians(guardian.address);
            expect(g.wallet).to.equal(guardian.address);
        });

        it("Should NOT confirm inactivity before threshold", async function () {
            await expect(afterLife.connect(guardian).confirmInactivity()).to.be.revertedWith("Owner Active");
        });

        it("Should confirm inactivity after threshold", async function () {
            await time.increase(INACTIVITY_THRESHOLD + 1);

            await expect(afterLife.connect(guardian).confirmInactivity())
                .to.emit(afterLife, "InactivityConfirmed");

            expect(await afterLife.isDead()).to.be.true;
        });
    });

    describe("Beneficiaries & Claims", function () {
        const ALLOCATION = 5000; // 50%
        const VESTING_DURATION = 1000; // 1000 seconds
        const VESTING_TYPE_LINEAR = 0;

        beforeEach(async function () {
            await afterLife.addGuardian("Guardian1", guardian.address);
            await afterLife.addBeneficiary("Ben1", beneficiary.address, ALLOCATION, VESTING_TYPE_LINEAR, VESTING_DURATION);

            // Fund the contract
            await owner.sendTransaction({
                to: await afterLife.getAddress(),
                value: ethers.parseEther("10.0")
            });
        });

        it("Should not allow claim while alive", async function () {
            await expect(afterLife.connect(beneficiary).claim()).to.be.revertedWith("Protocol Active");
        });

        it("Should unlock funds linearly after confirmation", async function () {
            // 1. Confirm Death
            await time.increase(INACTIVITY_THRESHOLD + 1);
            await afterLife.connect(guardian).confirmInactivity();

            // 2. Advance time 50% of vesting
            await time.increase(VESTING_DURATION / 2);

            // 3. Claim
            // Expected: 50% of (50% of 10ETH) = 2.5 ETH
            await afterLife.connect(beneficiary).claim();

            const b = await afterLife.beneficiaries(beneficiary.address);

            expect(b.amountClaimed).to.be.closeTo(ethers.parseEther("2.5"), ethers.parseEther("0.1"));
        });

        it("Should unlock 100% after full duration", async function () {
            await time.increase(INACTIVITY_THRESHOLD + 1);
            await afterLife.connect(guardian).confirmInactivity();

            await time.increase(VESTING_DURATION + 100);

            await afterLife.connect(beneficiary).claim();

            const b = await afterLife.beneficiaries(beneficiary.address);
            expect(b.amountClaimed).to.equal(ethers.parseEther("5.0"));
        });
    });
});
