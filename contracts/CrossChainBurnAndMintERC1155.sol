// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155Core, ERC1155} from "./ERC1155Core.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Withdraw} from "./utils/Withdraw.sol";

contract CrossChainBurnAndMintERC1155 is
    ERC1155Core,
    ReentrancyGuard,
    Withdraw,
    IAny2EVMMessageReceiver
{
    enum PayFeesIn {
        NATIVE,
        LINK
    }

    error InvalidRouter(address router);
    error NotEnoughBalanceForFees(uint256 balance, uint256 required);
    error ChainNotEnabled(uint64 chainSelector);
    error SenderNotEnabled(address sender);
    error OperationNotAllowedOnChain(uint64 chainSelector);

    struct XNftDetails {
        address xNftAddress;
        bytes ccipExtraArgsBytes;
    }

    IRouterClient internal immutable i_ccipRouter;
    LinkTokenInterface internal immutable i_linkToken;
    uint64 internal immutable i_currentChainSelector;

    mapping(uint64 destChainSelector => XNftDetails xNftDetails)
        internal s_chains;

    event ChainEnabled(
        uint64 destChainSelector,
        address nftAddress,
        bytes ccipExtraArgsBytes
    );
    event ChainDisabled(uint64 chainSelector);
    event CrossChainSent(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes data,
        uint64 sourceChainSelector,
        uint64 destChainSelector
    );
    event CrossChainReceived(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes data,
        uint64 sourceChainSelector,
        uint64 destChainSelector
    );

    modifier onlyRouter() {
        if (msg.sender != address(i_ccipRouter)) {
            revert InvalidRouter(msg.sender);
        }
        _;
    }

    modifier onlyEnabledChain(uint64 _chainSelector) {
        if (s_chains[_chainSelector].xNftAddress == address(0)) {
            revert ChainNotEnabled(_chainSelector);
        }
        _;
    }

    modifier onlyEnabledSender(uint64 _chainSelector, address _sender) {
        if (s_chains[_chainSelector].xNftAddress != _sender) {
            revert SenderNotEnabled(_sender);
        }
        _;
    }

    modifier onlyOtherChains(uint64 _chainSelector) {
        if (_chainSelector == i_currentChainSelector) {
            revert OperationNotAllowedOnChain(_chainSelector);
        }
        _;
    }

    constructor(
        string memory uri_,
        address ccipRouterAddress,
        address linkTokenAddress,
        uint64 currentChainSelector
    ) ERC1155Core(uri_) {
        i_ccipRouter = IRouterClient(ccipRouterAddress);
        i_linkToken = LinkTokenInterface(linkTokenAddress);
        i_currentChainSelector = currentChainSelector;
    }

    function enableChain(
        uint64 chainSelector,
        address xNftAddress,
        bytes memory ccipExtraArgsBytes
    ) external onlyOwner onlyOtherChains(chainSelector) {
        s_chains[chainSelector] = XNftDetails({
            xNftAddress: xNftAddress,
            ccipExtraArgsBytes: ccipExtraArgsBytes
        });
        emit ChainEnabled(chainSelector, xNftAddress, ccipExtraArgsBytes);
    }

    function disableChain(
        uint64 chainSelector
    ) external onlyOwner onlyOtherChains(chainSelector) {
        delete s_chains[chainSelector];
        emit ChainDisabled(chainSelector);
    }

    function crossChainTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data,
        uint64 destChainSelector,
        PayFeesIn payFeesIn
    )
        external
        nonReentrant
        onlyEnabledChain(destChainSelector)
        returns (bytes32 messageId)
    {
        string memory tokenUri = uri(id);
        burn(from, id, amount);

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(s_chains[destChainSelector].xNftAddress),
            data: abi.encode(from, to, id, amount, data, tokenUri),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: s_chains[destChainSelector].ccipExtraArgsBytes,
            feeToken: payFeesIn == PayFeesIn.NATIVE
                ? address(0)
                : address(i_linkToken)
        });

        uint256 fees = i_ccipRouter.getFee(destChainSelector, message);

        if (payFeesIn == PayFeesIn.LINK) {
            if (i_linkToken.balanceOf(address(this)) < fees) {
                revert NotEnoughBalanceForFees(
                    i_linkToken.balanceOf(address(this)),
                    fees
                );
            }
            i_linkToken.approve(address(i_ccipRouter), fees);
            messageId = i_ccipRouter.ccipSend(destChainSelector, message);
        } else {
            if (address(this).balance < fees) {
                revert NotEnoughBalanceForFees(address(this).balance, fees);
            }
            messageId = i_ccipRouter.ccipSend{value: fees}(
                destChainSelector,
                message
            );
        }
        emit CrossChainSent(
            from,
            to,
            id,
            amount,
            data,
            i_currentChainSelector,
            destChainSelector
        );
        return messageId;
    }

    function ccipReceive(
        Client.Any2EVMMessage memory message
    )
        external
        virtual
        override
        onlyRouter
        nonReentrant
        onlyEnabledChain(message.sourceChainSelector)
        onlyEnabledSender(
            message.sourceChainSelector,
            abi.decode(message.sender, (address))
        )
    {
        uint64 sourceChainSelector = message.sourceChainSelector;
        (
            address from,
            address to,
            uint256 id,
            uint256 amount,
            bytes memory data,
            string memory tokenUri
        ) = abi.decode(
                message.data,
                (address, address, uint256, uint256, bytes, string)
            );
        mint(to, id, amount, data, tokenUri);

        emit CrossChainReceived(
            from,
            to,
            id,
            amount,
            data,
            sourceChainSelector,
            i_currentChainSelector
        );
    }
}
