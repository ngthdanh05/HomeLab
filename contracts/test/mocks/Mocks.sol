// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @dev Mock ECO Token (ERC20Votes). Thay bằng ECOToken thật nếu nó đã là ERC20Votes.
contract MockECO is ERC20, ERC20Permit, ERC20Votes {
    constructor() ERC20("ECO", "ECO") ERC20Permit("ECO") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}

/// @dev Mock PaymentSplitter: nhận ETH rồi chuyển toàn bộ cho `to`.
///      Thay bằng PaymentSplitter thật của dự án trong integration test.
contract MockPaymentSplitter {
    receive() external payable {}

    function release(address payable to) external {
        (bool ok,) = to.call{value: address(this).balance}("");
        require(ok, "release failed");
    }
}

/// @dev Recipient luôn revert khi nhận ETH.
contract RejectingReceiver {
    receive() external payable {
        revert("no thanks");
    }
}
