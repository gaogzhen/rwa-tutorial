// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * 模拟 CCIP Router 合约用于测试
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract MockCcipRouter {
    // 模拟的 CCIP Router 实现
    // 在实际测试中，这个合约可以包含基本的 CCIP 功能模拟
    // 这里只提供一个占位符实现

    // 模拟发送消息的函数
    function ccipSend(
        uint64 destinationChainSelector,
        bytes memory message
    ) external payable returns (bytes32) {
        // 返回一个模拟的消息 ID
        return keccak256(abi.encodePacked(block.timestamp, msg.sender, message));
    }

    // 模拟获取费用的函数
    function getFee(
        uint64 destinationChainSelector,
        bytes memory message
    ) external pure returns (uint256) {
        // 返回一个固定的费用（用于测试）
        return 0.001 ether;
    }
}
