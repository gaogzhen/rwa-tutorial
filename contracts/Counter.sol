// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20; // 使用与项目其他合约一致的 Solidity 版本

contract Counter {
  uint public x;

  event Increment(uint by);

  function inc() public {
    x++;
    emit Increment(1);
  }

  function incBy(uint by) public {
    require(by > 0, "incBy: increment should be positive");
    x += by;
    emit Increment(by);
  }
}
