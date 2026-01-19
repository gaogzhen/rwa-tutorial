// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/interfaces/IERC1155Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {AutomationCompatible} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract EnglishAuction is IERC1155Receiver, ReentrancyGuard, AutomationCompatible {
    error EnglishAuction_OnlySellerCanCall();
    error EnglishAuction_AuctionAlreadyStarted();
    error OnlyRealEstateTokenSupported();
    error EnglishAuction_NoAuctionsProgress();
    error EnglishAuction_AuctionEnded();
    error EnglishAuction_BidNotHighEnough();
    error EnglishAuction_CannotWithdrawHightestBid();
    error EnglishAuction_TooEarlyToEnd();
    error FailedToWithdrawBid(address bidder, uint256 amount);
    error NothingToWithdraw();
    error FailedToSendEth(address recipient, uint256 amount);

    address internal immutable i_seller;
    address internal immutable i_fractionalizedRealEstateToken;

    bool internal s_started;
    uint48 internal s_endTimestamp;
    address internal s_highestBidder;
    uint256 internal s_highestBid;
    uint256 internal s_tokenIdOnAuction;
    uint256 internal s_fractionalizedAmountOnAuction;

    mapping(address bidder => uint256 totalBidAmount) internal s_bids;

    event AuctionStarted(
        uint256 indexed tokenId,
        uint256 indexed amount,
        uint48 indexed endTimestamp
    );
    event Bid(address indexed bidder, uint256 indexed amount);
    event AuctionEnded(
        uint256 indexed tokenId,
        uint256 amount,
        address indexed winner,
        uint256 indexed winningAmount
    );

    constructor(address fractionalizedRealEstateTokenAddress) {
        i_seller = msg.sender;
        i_fractionalizedRealEstateToken = fractionalizedRealEstateTokenAddress;
    }

    function startAuction(
        uint256 tokenId,
        uint256 amount,
        bytes calldata data,
        uint256 startingBid
    ) external nonReentrant {
        if (s_started) {
            revert EnglishAuction_AuctionAlreadyStarted();
        }
        if (msg.sender != i_seller) {
            revert EnglishAuction_OnlySellerCanCall();
        }
        IERC1155(i_fractionalizedRealEstateToken).safeTransferFrom(
            i_seller,
            address(this),
            tokenId,
            amount,
            data
        );
        s_started = true;
        s_endTimestamp = SafeCast.toUint48(block.timestamp + 7 days);
        s_tokenIdOnAuction = tokenId;
        s_fractionalizedAmountOnAuction = amount;
        s_highestBidder = msg.sender;
        s_highestBid = startingBid;

        emit AuctionStarted(tokenId, amount, s_endTimestamp);
    }

    function getTokenIdOnAuction() external view returns (uint256) {
        return s_tokenIdOnAuction;
    }

    function bid() external payable nonReentrant {
        if (!s_started) {
            revert EnglishAuction_NoAuctionsProgress();
        }
        if (block.timestamp >= s_endTimestamp) {
            revert EnglishAuction_AuctionEnded();
        }
        if (msg.value <= s_highestBid) {
            revert EnglishAuction_BidNotHighEnough();
        }

        s_highestBidder = msg.sender;
        s_highestBid = msg.value;
        s_bids[msg.sender] += msg.value;

        emit Bid(msg.sender, msg.value);
    }

    function withdrawBid() external nonReentrant {
        if (msg.sender == s_highestBidder) {
            revert EnglishAuction_CannotWithdrawHightestBid();
        }
        uint256 amount = s_bids[msg.sender];
        if (amount == 0) {
            revert NothingToWithdraw();
        }
        delete s_bids[msg.sender];

        (bool sent, ) = msg.sender.call{value: amount}("");
        if (!sent) {
            revert FailedToSendEth(msg.sender, amount);
        }
    }

    function endAuction() external nonReentrant {
        if (!s_started) {
            revert EnglishAuction_NoAuctionsProgress(); // 拍卖未开始，无法结束
        }
        if (block.timestamp < s_endTimestamp) {
            revert EnglishAuction_TooEarlyToEnd(); // 拍卖未到期，无法结束
        }
        // 调用内部结束拍卖函数
        _endAuction(); // 执行结束拍卖的内部逻辑
    }

    function onERC1155Received(
        address /*operator*/,
        address /*from*/,
        uint256 /*id*/,
        uint256 /*value*/,
        bytes calldata /*data*/
    ) external view returns (bytes4) {
        if (msg.sender != address(i_fractionalizedRealEstateToken)) {
            revert OnlyRealEstateTokenSupported();
        }

        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address /*operator*/,
        address /*from*/,
        uint256[] calldata /*ids*/,
        uint256[] calldata /*values*/,
        bytes calldata /*data*/
    ) external view returns (bytes4) {
        if (msg.sender != address(i_fractionalizedRealEstateToken)) {
            revert OnlyRealEstateTokenSupported();
        }

        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    /**
     * @notice Chainlink Automation: 检查是否需要执行维护操作
     * @dev 检查拍卖是否已到期且仍在进行中，需要自动结束
     * @return upkeepNeeded 是否需要执行维护操作
     * @return performData 执行维护操作所需的数据
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override cannotExecute returns (bool upkeepNeeded, bytes memory performData) {
        // 检查拍卖是否已开始
        if (!s_started) {
            return (false, ""); // 拍卖未开始，不需要维护
        }
        // 检查拍卖是否已到期
        if (block.timestamp < s_endTimestamp) {
            return (false, ""); // 拍卖未到期，不需要维护
        }
        // 拍卖已到期，需要结束
        upkeepNeeded = true; // 标记需要执行维护操作
        performData = ""; // 不需要额外的执行数据
        return (upkeepNeeded, performData);
    }

    /**
     * @notice Chainlink Automation: 执行维护操作
     * @dev 当拍卖到期时，自动调用 endAuction 结束拍卖
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        // 验证拍卖状态：必须已开始且已到期
        if (!s_started) {
            revert EnglishAuction_NoAuctionsProgress(); // 拍卖未开始，无法结束
        }
        if (block.timestamp < s_endTimestamp) {
            revert EnglishAuction_TooEarlyToEnd(); // 拍卖未到期，无法结束
        }
        // 调用内部结束拍卖逻辑
        _endAuction(); // 执行结束拍卖的内部函数
    }

    /**
     * @notice 内部函数：结束拍卖
     * @dev 将代币转移给最高出价者，将 ETH 发送给卖家
     */
    function _endAuction() internal {
        s_started = false; // 标记拍卖已结束
        // 将代币转移给最高出价者
        IERC1155(i_fractionalizedRealEstateToken).safeTransferFrom(
            address(this),
            s_highestBidder,
            s_tokenIdOnAuction,
            s_fractionalizedAmountOnAuction,
            ""
        );
        // 将最高出价发送给卖家
        (bool sent, ) = i_seller.call{value: s_highestBid}("");
        if (!sent) {
            revert FailedToSendEth(i_seller, s_highestBid); // 发送 ETH 失败
        }
        // 触发拍卖结束事件
        emit AuctionEnded(
            s_tokenIdOnAuction,
            s_fractionalizedAmountOnAuction,
            s_highestBidder,
            s_highestBid
        );
    }
}
