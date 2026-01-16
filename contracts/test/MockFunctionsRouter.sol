// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFunctionsRouter} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/interfaces/IFunctionsRouter.sol";
import {FunctionsResponse} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsResponse.sol";

/**
 * 模拟 FunctionsRouter 合约用于测试
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract MockFunctionsRouter is IFunctionsRouter {
    // 存储请求 ID 到客户端的映射
    mapping(bytes32 => address) private s_requestIdToClient; // 请求 ID 到客户端地址的映射
    // 存储请求 ID 到请求详情的映射（简化版本，仅存储必要信息）
    mapping(bytes32 => address) private s_requestClients; // 请求 ID 到客户端地址的映射
    mapping(bytes32 => uint64) private s_requestSubscriptions; // 请求 ID 到订阅 ID 的映射
    mapping(bytes32 => uint32) private s_requestGasLimits; // 请求 ID 到 Gas 限制的映射
    // 允许列表 ID
    bytes32 private s_allowListId; // 允许列表 ID
    // 管理员费用
    uint72 private s_adminFee; // 管理员费用

    // 发送请求并返回请求 ID
    function sendRequest(
        uint64 subscriptionId, // 订阅 ID
        bytes calldata data, // 请求数据
        uint16 dataVersion, // 数据版本
        uint32 callbackGasLimit, // 回调 Gas 限制
        bytes32 donId // DON ID
    ) external override returns (bytes32 requestId) {
        // 生成一个模拟的请求 ID
        requestId = keccak256(
            abi.encodePacked(
                block.timestamp, // 当前时间戳
                block.number, // 当前区块号
                msg.sender, // 发送者地址
                subscriptionId, // 订阅 ID
                data // 请求数据
            )
        );
        // 存储请求 ID 到客户端的映射
        s_requestIdToClient[requestId] = msg.sender; // 保存客户端地址
        // 存储请求详情（简化版本）
        s_requestClients[requestId] = msg.sender; // 保存客户端地址
        s_requestSubscriptions[requestId] = subscriptionId; // 保存订阅 ID
        s_requestGasLimits[requestId] = callbackGasLimit; // 保存 Gas 限制
        return requestId; // 返回请求 ID
    }

    // 发送请求到提议的合约
    function sendRequestToProposed(
        uint64 subscriptionId, // 订阅 ID
        bytes calldata data, // 请求数据
        uint16 dataVersion, // 数据版本
        uint32 callbackGasLimit, // 回调 Gas 限制
        bytes32 donId // DON ID
    ) external override returns (bytes32 requestId) {
        // 与 sendRequest 相同的实现
        return this.sendRequest(subscriptionId, data, dataVersion, callbackGasLimit, donId);
    }

    // 模拟处理 Oracle 响应（用于测试）
    // 这是一个辅助函数，用于在测试中模拟 Router 调用客户端的 handleOracleFulfillment
    function fulfillRequest(
        bytes32 requestId, // 请求 ID
        bytes memory response, // 响应数据
        bytes memory err // 错误信息
    ) external {
        // 获取客户端地址
        address client = s_requestIdToClient[requestId]; // 获取客户端地址
        require(client != address(0), "Request ID not found"); // 验证请求 ID 存在

        // 调用客户端的 handleOracleFulfillment 函数
        // 注意：这需要客户端实现了 IFunctionsClient 接口
        (bool success, bytes memory returnData) = client.call(
            abi.encodeWithSignature(
                "handleOracleFulfillment(bytes32,bytes,bytes)", // 函数签名
                requestId, // 请求 ID
                response, // 响应数据
                err // 错误信息
            )
        );
        if (!success) {
            // 如果调用失败，尝试解码错误信息
            if (returnData.length > 0) {
                assembly {
                    let returndata_size := mload(returnData) // 获取返回数据大小
                    revert(add(32, returnData), returndata_size) // 回滚并返回错误信息
                }
            }
            revert("Fulfillment failed"); // 如果无法解码错误，使用默认错误消息
        }
    }

    // 实现 IFunctionsRouter 接口的 fulfill 函数
    function fulfill(
        bytes memory response, // 响应数据
        bytes memory err, // 错误信息
        uint96 juelsPerGas, // 每 Gas 的 Juels
        uint96 costWithoutFulfillment, // 不含履行的成本
        address transmitter, // 传输者地址
        FunctionsResponse.Commitment memory commitment // 请求详情
    ) external override returns (FunctionsResponse.FulfillResult, uint96) {
        // 获取客户端地址和请求 ID
        address client = commitment.client; // 获取客户端地址
        bytes32 requestId = commitment.requestId; // 获取请求 ID

        // 调用客户端的 handleOracleFulfillment 函数
        (bool success, ) = client.call(
            abi.encodeWithSignature(
                "handleOracleFulfillment(bytes32,bytes,bytes)", // 函数签名
                requestId, // 请求 ID
                response, // 响应数据
                err // 错误信息
            )
        );
        require(success, "Fulfillment failed"); // 验证调用成功

        return (FunctionsResponse.FulfillResult.FULFILLED, 0); // 返回成功结果
    }

    // 获取请求 ID 对应的客户端地址
    function getClient(bytes32 requestId) external view returns (address) {
        return s_requestIdToClient[requestId]; // 返回客户端地址
    }

    // 获取允许列表 ID
    function getAllowListId() external view override returns (bytes32) {
        return s_allowListId; // 返回允许列表 ID
    }

    // 设置允许列表 ID
    function setAllowListId(bytes32 allowListId) external override {
        s_allowListId = allowListId; // 设置允许列表 ID
    }

    // 获取管理员费用
    function getAdminFee() external view override returns (uint72) {
        return s_adminFee; // 返回管理员费用
    }

    // 设置管理员费用
    function setAdminFee(uint72 adminFee) external {
        s_adminFee = adminFee; // 设置管理员费用
    }

    // 验证回调 Gas 限制是否有效
    function isValidCallbackGasLimit(uint64 subscriptionId, uint32 callbackGasLimit) external view override {
        // 简化实现，总是返回 true
        // 在实际测试中，您可能需要添加更复杂的验证逻辑
    }

    // 根据 ID 获取合约地址
    function getContractById(bytes32 id) external view override returns (address) {
        return address(0); // 简化实现，返回零地址
    }

    // 根据 ID 获取提议的合约地址
    function getProposedContractById(bytes32 id) external view override returns (address) {
        return address(0); // 简化实现，返回零地址
    }

    // 获取提议的合约集合
    function getProposedContractSet() external view override returns (bytes32[] memory, address[] memory) {
        return (new bytes32[](0), new address[](0)); // 简化实现，返回空数组
    }

    // 提议合约更新
    function proposeContractsUpdate(bytes32[] memory proposalSetIds, address[] memory proposalSetAddresses) external override {
        // 简化实现，不做任何操作
    }

    // 更新合约
    function updateContracts() external override {
        // 简化实现，不做任何操作
    }

    // 暂停系统
    function pause() external override {
        // 简化实现，不做任何操作
    }

    // 取消暂停系统
    function unpause() external override {
        // 简化实现，不做任何操作
    }
}
