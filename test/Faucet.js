const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Faucet", () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContractAndSetVariables() {
    const [owner, otherAccount] = await ethers.getSigners();

    const Faucet = await ethers.getContractFactory("Faucet", owner);
    const faucet = await Faucet.deploy();

    await faucet.waitForDeployment();

    console.log("Signer 1 address: ", owner.address);

    const withdrawalAmount = ethers.parseEther("1");

    return { faucet, owner, otherAccount, withdrawalAmount };
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

  it("Should allow only the owner to withdraw all funds", async () => {
    const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

    // Fund the contract
    const fundAmount = ethers.parseEther("1");
    await owner.sendTransaction({
      to: faucet.target,
      value: fundAmount,
    });

    // Confirm correct owner
    expect(await faucet.owner()).to.equal(owner.address);

    // Confirm contract balance
    expect(await ethers.provider.getBalance(faucet.target)).to.equal(
      fundAmount
    );

    // Owner's balance before
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

    // Withdraw all
    const tx = await faucet.withdrawAll();
    const receipt = await tx.wait();

    const pricePaidPerGas = receipt.effectiveGasPrice || receipt.gasPrice;

    const gasUsed = BigInt(receipt.gasUsed) * BigInt(pricePaidPerGas);

    // Check contract balance is now zero
    expect(await ethers.provider.getBalance(faucet.target)).to.equal(0);

    // Owner's balance after
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

    expect(ownerBalanceAfter).to.be.closeTo(
      ownerBalanceBefore + fundAmount - gasUsed,
      ethers.parseEther("0.01")
    );
  });

  it("Should revert if non-owner tries to withdraw all funds", async () => {
    const { faucet, otherAccount } = await loadFixture(
      deployContractAndSetVariables
    );

    await expect(faucet.connect(otherAccount).withdrawAll()).to.be.reverted;
  });

  it("Should allow only the owner to destroy the contract", async () => {
    // This line remains the same
    const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

    // Ethers v6: Use ethers.parseEther, not ethers.utils.parseEther
    const fundAmount = ethers.parseEther("1");

    // Ethers v6 Fix: Use `faucet.target` to get the contract address
    await owner.sendTransaction({
      to: faucet.target,
      value: fundAmount,
    });

    // Use faucet.target for all address references
    const contractBalance = await ethers.provider.getBalance(faucet.target);
    expect(contractBalance).to.equal(fundAmount);

    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

    // Destroy the contract
    const tx = await faucet.destroyFaucet();
    const receipt = await tx.wait();

    // Check for effectiveGasPrice (EIP-1559) and fall back to gasPrice (legacy)
    const pricePaidPerGas = receipt.effectiveGasPrice || receipt.gasPrice;

    // Ethers v6 Best Practice: Use `effectiveGasPrice` for accurate cost calculation
    // It returns a BigInt, so we use BigInt multiplication (`*`)
    const gasUsed = BigInt(receipt.gasUsed) * BigInt(pricePaidPerGas);

    // Check that the contract code is now gone
    // const code = await ethers.provider.getCode(faucet.target);
    // expect(code).to.equal("0x");

    // Owner balance should have increased by fundAmount (minus gas)
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

    const expectedBalance = ownerBalanceBefore + fundAmount - gasUsed;

    // Check for the exact expected balance
    expect(ownerBalanceAfter).to.equal(expectedBalance);
  });

  it("Should revert if non-owner tries to destroy the contract", async () => {
    const { faucet, otherAccount } = await loadFixture(
      deployContractAndSetVariables
    );

    await expect(faucet.connect(otherAccount).destroyFaucet()).to.be.reverted;
  });
});
