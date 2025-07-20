// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract Faucet {
    address payable public owner;

    constructor() payable {
        owner = payable(msg.sender);
    }

    function withdraw(uint _amount) public payable {
        // users can only withdraw .1 ETH at a time, feel free to change this!
        require(_amount <= 0.1 ether, "Cannot withdraw more than 0.1 ETH");
        (bool sent, ) = payable(msg.sender).call{value: _amount}("");
        require(sent, "Failed to send Ether");
    }

    function withdrawAll() public onlyOwner {
        // owner.transfer(address(this).balance);
        (bool sent, ) = owner.call{value: address(this).balance}("");
        require(sent, "Failed to withdraw all funds");
    }

    function destroyFaucet() public onlyOwner {
        selfdestruct(owner);
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    receive() external payable {}
}
