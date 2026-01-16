// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {OwnerIsCreator} from "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract Withdraw is OwnerIsCreator {
   using SafeERC20 for IERC20;

   error NothingToWithdraw();
   error FailedToWithdraw();

   function withdraw(address _beneficiary) public onlyOwner {
    uint256 balance = address(this).balance;
    if (balance == 0) {
        revert NothingToWithdraw();
    }
    (bool success, ) = _beneficiary.call{value: balance}("");
    if (!success) {
        revert FailedToWithdraw();
    }
   }

   function withdrawToken(address _token, address _beneficiary) public onlyOwner {
    uint256 balance = IERC20(_token).balanceOf(address(this));
    if (balance == 0) {
        revert NothingToWithdraw();
    }
    IERC20(_token).safeTransfer(_beneficiary, balance);
   }
}