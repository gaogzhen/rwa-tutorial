// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155Supply, ERC1155} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {OwnerIsCreator} from "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
contract ERC1155Core is ERC1155Supply, OwnerIsCreator {
    address internal s_issuer;

    // optional mapping for token uris
    mapping(uint256 tokenId => string) private _tokenURIs;

    event IssuerSet(address indexed issuer); // 事件：发行者已设置

    error ERC1155Core__CallerIsNotIssuerOrItself();

    modifier onlyIssuerOrItself() {
        if (msg.sender != s_issuer && msg.sender != address(this)) {
            revert ERC1155Core__CallerIsNotIssuerOrItself();
        }
        _;
    }

    modifier onlyApprovedForAll(address account) {
        if (
            account != _msgSender() && !isApprovedForAll(account, _msgSender())
        ) {
            revert ERC1155MissingApprovalForAll(_msgSender(), account);
        }
        _;
    }

    constructor(string memory uri_) ERC1155(uri_) {}

    function setIssuer(address issuer) external onlyOwner {
        // 函数：设置发行者地址
        s_issuer = issuer; // 更新发行者地址
        emit IssuerSet(issuer); // 触发事件：发行者已设置
    }

    function mint(
        address _to,
        uint256 _id,
        uint256 _amount,
        bytes memory _data,
        string memory _tokenUri
    ) public onlyIssuerOrItself {
        _mint(_to, _id, _amount, _data);
        _tokenURIs[_id] = _tokenUri;
    }

    function mintBatch(
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data,
        string[] memory _tokenUris
    ) public onlyIssuerOrItself {
        _mintBatch(_to, _ids, _amounts, _data);
        for (uint256 i = 0; i < _ids.length; ++i) {
            _tokenURIs[_ids[i]] = _tokenUris[i];
        }
    }

    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) public onlyIssuerOrItself {
        if (
            account != _msgSender() && !isApprovedForAll(account, _msgSender())
        ) {
            revert ERC1155MissingApprovalForAll(_msgSender(), account);
        }

        _burn(account, id, amount);
    }

    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) public onlyIssuerOrItself {
        if (
            account != _msgSender() && !isApprovedForAll(account, _msgSender())
        ) {
            revert ERC1155MissingApprovalForAll(_msgSender(), account);
        }

        _burnBatch(account, ids, amounts);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        string memory tokenURI = _tokenURIs[tokenId];

        return bytes(tokenURI).length > 0 ? tokenURI : super.uri(tokenId);
    }

    function setURI(uint256 tokenId, string memory tokenURI) internal {
        _tokenURIs[tokenId] = tokenURI;
        emit URI(uri(tokenId), tokenId);
    }
}
