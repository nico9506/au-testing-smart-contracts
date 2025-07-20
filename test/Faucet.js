const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Fuacet", () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContractAndSetVariables() {
    const Faucet = await ethers.getContractFactory("Faucet");
    const faucet = await Faucet.deploy();

    const [owner] = await ethers.getSigners();

    console.log("Signer 1 address: ", owner.address);

    let withdrawalAmount = ethers.parseEther("1");

    return { faucet, owner, withdrawalAmount };
  }

  it("Should deploy and set owner correctly", async () => {
    const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

    expect(await faucet.owner()).to.equal(owner.address);
  });

  it("Should not allow withdrawals over 0.1 ETH at a time", async () => {
    const { faucet, withdrawalAmount } = await loadFixture(
      deployContractAndSetVariables
    );
    console.log(`withdrawalAmount: ${withdrawalAmount} gwei`);
    await expect(faucet.withdraw(withdrawalAmount)).to.be.revertedWith(
      "Cannot withdraw more than 0.1 ETH"
    );
  });
});
