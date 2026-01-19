// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RealEstateToken} from "./RealEstateToken.sol";
import {OwnerIsCreator} from "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol";
import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {FunctionsSourceRetry} from "./FunctionsSourceRetry.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 * 
 * 此合约使用 FunctionsSourceRetry，JavaScript 代码中包含 API 请求重试功能（最多 3 次）
 */
contract IssuerRetry is FunctionsClient, FunctionsSourceRetry, OwnerIsCreator {
    using FunctionsRequest for FunctionsRequest.Request;

    error LatestIssueInProcess();
    error MaxRetriesExceeded();
    error RequestNotTimedOut();
    error NoPendingRequest();

    // 事件：用于追踪代码执行
    event IssueRequestInitiated(
        address indexed to,
        uint256 indexed amount,
        uint64 indexed subscriptionId,
        uint32 gasLimit,
        bytes32 donId
    );
    event RequestPrepared(bytes32 indexed requestId);
    event RequestSentToFunctions(bytes32 indexed requestId);
    event RequestRetry(
        bytes32 indexed originalRequestId,
        bytes32 indexed newRequestId,
        uint8 retryCount
    );
    event RequestFailed(
        bytes32 indexed requestId,
        string reason,
        uint8 retryCount
    );
    event RequestTimedOut(
        bytes32 indexed requestId,
        uint256 timestamp,
        uint8 retryCount
    );

    struct FractionalizedNft {
        address to;
        uint256 amount;
        uint64 subscriptionId;
        uint32 gasLimit;
        bytes32 donId;
        uint8 retryCount; // 重试次数
        uint256 requestTimestamp; // 请求时间戳
    }

    RealEstateToken internal immutable i_realEstateToken;

    bytes32 internal s_lastRequestId;
    uint256 private s_nextTokenId;
    uint8 private constant MAX_RETRIES = 3; // 最大重试次数
    uint256 private constant REQUEST_TIMEOUT = 5 minutes; // 请求超时时间：5 分钟

    mapping(bytes32 requestId => FractionalizedNft) internal s_issuesInProcess;
    mapping(bytes32 requestId => bytes32) internal s_originalRequestId; // 原始请求 ID 映射
    mapping(bytes32 requestId => uint256) internal s_requestTimestamps; // 请求时间戳映射

    constructor(
        address realEstateToken,
        address functionsRouterAddress
    ) FunctionsClient(functionsRouterAddress) {
        i_realEstateToken = RealEstateToken(realEstateToken);
    }

    function issue(
        address to,
        uint256 amount,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donId
    ) external onlyOwner returns (bytes32 requestId) {
        if (s_lastRequestId != bytes32(0)) {
            revert LatestIssueInProcess();
        }

        // 发出事件：记录请求初始化
        emit IssueRequestInitiated(to, amount, subscriptionId, gasLimit, donId);

        // 步骤 1: 初始化请求（第 51 行）
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(this.getNftMetadata());
        
        // 发出事件：记录请求已准备
        emit RequestPrepared(bytes32(0)); // 此时 requestId 还未生成

        // 步骤 2: 发送请求到 Chainlink Functions（第 52-57 行）
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        // 发出事件：记录请求已发送
        emit RequestSentToFunctions(requestId);

        // 存储请求信息（包括重试所需的参数）
        uint256 currentTimestamp = block.timestamp;
        s_issuesInProcess[requestId] = FractionalizedNft({
            to: to,
            amount: amount,
            subscriptionId: subscriptionId,
            gasLimit: gasLimit,
            donId: donId,
            retryCount: 0, // 初始请求，重试次数为 0
            requestTimestamp: currentTimestamp
        });
        s_originalRequestId[requestId] = requestId; // 原始请求 ID 指向自己
        s_requestTimestamps[requestId] = currentTimestamp; // 记录请求时间戳
        s_lastRequestId = requestId;
    }

    function cancelPendingRequest() external onlyOwner {
        s_lastRequestId = bytes32(0);
    }

    /**
     * @notice 检查请求是否超时，如果超时则自动重试
     * @dev 可以由 Chainlink Automation 定期调用，或手动调用
     * @return upkeepNeeded 是否需要执行重试
     * @return performData 执行数据（如果需要重试）
     */
    function checkUpkeep(
        bytes calldata
    ) external view returns (bool upkeepNeeded, bytes memory performData) {
        if (s_lastRequestId == bytes32(0)) {
            return (false, "");
        }

        bytes32 originalRequestId = s_lastRequestId;
        FractionalizedNft memory fractionalizedNft = s_issuesInProcess[originalRequestId];

        // 检查是否超时
        if (block.timestamp >= fractionalizedNft.requestTimestamp + REQUEST_TIMEOUT) {
            // 检查是否已达到最大重试次数
            if (fractionalizedNft.retryCount < MAX_RETRIES) {
                upkeepNeeded = true;
                performData = abi.encode(originalRequestId);
            }
        }

        return (upkeepNeeded, performData);
    }

    /**
     * @notice 执行超时重试（由 Chainlink Automation 调用）
     * @param performData 包含原始请求 ID 的编码数据
     */
    function performUpkeep(bytes calldata performData) external {
        bytes32 originalRequestId = abi.decode(performData, (bytes32));

        // 验证请求是否仍然有效
        if (s_lastRequestId != originalRequestId) {
            revert NoPendingRequest();
        }

        FractionalizedNft memory fractionalizedNft = s_issuesInProcess[originalRequestId];

        // 检查是否超时
        if (block.timestamp < fractionalizedNft.requestTimestamp + REQUEST_TIMEOUT) {
            revert RequestNotTimedOut();
        }

        // 检查是否已达到最大重试次数
        if (fractionalizedNft.retryCount >= MAX_RETRIES) {
            revert MaxRetriesExceeded();
        }

        // 发出超时事件
        emit RequestTimedOut(
            originalRequestId,
            block.timestamp,
            fractionalizedNft.retryCount
        );

        // 执行重试
        _retryRequest(originalRequestId, fractionalizedNft);
    }

    /**
     * @notice 手动检查并重试超时的请求
     * @dev 如果请求超时且未达到最大重试次数，将自动重试
     */
    function retryTimedOutRequest() external {
        if (s_lastRequestId == bytes32(0)) {
            revert NoPendingRequest();
        }

        bytes32 originalRequestId = s_lastRequestId;
        FractionalizedNft memory fractionalizedNft = s_issuesInProcess[originalRequestId];

        // 检查是否超时
        if (block.timestamp < fractionalizedNft.requestTimestamp + REQUEST_TIMEOUT) {
            revert RequestNotTimedOut();
        }

        // 检查是否已达到最大重试次数
        if (fractionalizedNft.retryCount >= MAX_RETRIES) {
            revert MaxRetriesExceeded();
        }

        // 发出超时事件
        emit RequestTimedOut(
            originalRequestId,
            block.timestamp,
            fractionalizedNft.retryCount
        );

        // 执行重试
        _retryRequest(originalRequestId, fractionalizedNft);
    }

    /**
     * @notice 获取当前请求的状态信息
     * @return hasPendingRequest 是否有待处理的请求
     * @return requestId 当前请求 ID
     * @return retryCount 重试次数
     * @return requestTimestamp 请求时间戳
     * @return isTimedOut 是否已超时
     * @return timeRemaining 剩余时间（秒）
     */
    function getRequestStatus()
        external
        view
        returns (
            bool hasPendingRequest,
            bytes32 requestId,
            uint8 retryCount,
            uint256 requestTimestamp,
            bool isTimedOut,
            uint256 timeRemaining
        )
    {
        if (s_lastRequestId == bytes32(0)) {
            return (false, bytes32(0), 0, 0, false, 0);
        }

        bytes32 originalRequestId = s_lastRequestId;
        FractionalizedNft memory fractionalizedNft = s_issuesInProcess[originalRequestId];

        uint256 elapsed = block.timestamp - fractionalizedNft.requestTimestamp;
        bool timedOut = elapsed >= REQUEST_TIMEOUT;
        uint256 remaining = timedOut ? 0 : REQUEST_TIMEOUT - elapsed;

        return (
            true,
            originalRequestId,
            fractionalizedNft.retryCount,
            fractionalizedNft.requestTimestamp,
            timedOut,
            remaining
        );
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        // 获取原始请求 ID（如果是重试，需要找到原始请求）
        bytes32 originalRequestId = s_originalRequestId[requestId];
        if (originalRequestId == bytes32(0)) {
            originalRequestId = requestId; // 如果没有映射，说明是原始请求
        }

        // 检查是否是当前正在处理的请求
        if (s_lastRequestId != originalRequestId) {
            return; // 不是当前请求，忽略
        }

        // 获取请求信息
        FractionalizedNft memory fractionalizedNft = s_issuesInProcess[originalRequestId];

        // 如果请求失败，尝试重试
        if (err.length != 0) {
            string memory errorMessage = string(err);
            
            // 检查是否已达到最大重试次数
            if (fractionalizedNft.retryCount >= MAX_RETRIES) {
                emit RequestFailed(requestId, errorMessage, fractionalizedNft.retryCount);
                s_lastRequestId = bytes32(0);
                revert MaxRetriesExceeded();
            }

            // 发出重试事件
            emit RequestFailed(requestId, errorMessage, fractionalizedNft.retryCount);

            // 重试请求
            _retryRequest(originalRequestId, fractionalizedNft);
            return;
        }

        // 请求成功，处理响应
        string memory tokenURI = string(response);
        uint256 tokenId = s_nextTokenId++;
        
        // 铸造代币
        i_realEstateToken.mint(
            fractionalizedNft.to,
            tokenId,
            fractionalizedNft.amount,
            "",
            tokenURI
        );
        
        // 清理状态
        s_lastRequestId = bytes32(0);
        // 清理时间戳映射（可选，节省 gas）
        delete s_requestTimestamps[originalRequestId];
    }

    /**
     * @notice 内部函数：重试请求
     * @param originalRequestId 原始请求 ID
     * @param fractionalizedNft 原始请求信息
     */
    function _retryRequest(
        bytes32 originalRequestId,
        FractionalizedNft memory fractionalizedNft
    ) internal {
        // 增加重试计数
        fractionalizedNft.retryCount++;

        // 准备新的请求
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(this.getNftMetadata());

        // 发送新的请求
        bytes32 newRequestId = _sendRequest(
            req.encodeCBOR(),
            fractionalizedNft.subscriptionId,
            fractionalizedNft.gasLimit,
            fractionalizedNft.donId
        );

        // 发出重试事件
        emit RequestRetry(originalRequestId, newRequestId, fractionalizedNft.retryCount);

        // 更新映射：新请求 ID 指向原始请求 ID
        s_originalRequestId[newRequestId] = originalRequestId;

        // 更新请求信息（保留原始请求信息，但更新重试次数和时间戳）
        uint256 currentTimestamp = block.timestamp;
        fractionalizedNft.requestTimestamp = currentTimestamp;
        s_issuesInProcess[originalRequestId] = fractionalizedNft;
        s_requestTimestamps[newRequestId] = currentTimestamp; // 记录新请求的时间戳

        // 更新最后请求 ID
        s_lastRequestId = originalRequestId; // 保持原始请求 ID
    }
}
