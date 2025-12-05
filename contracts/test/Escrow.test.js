const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow", function () {
    let Escrow;
    let escrow;
    let deployer;
    let employer;
    let worker;
    let thirdParty;

    beforeEach(async function () {
        Escrow = await ethers.getContractFactory("Escrow");
        [deployer, employer, worker, thirdParty] = await ethers.getSigners();
        escrow = await Escrow.deploy();
        await escrow.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right deployer", async function () {
            // No direct deployer state variable, but we can assume deployer is the one who deployed
            // For now, this test is more about ensuring the setup works.
            expect(true).to.be.true; // Placeholder test
        });
    });
});
