// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract LiquiFiINFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(uint256 => string) private _invoiceHashes;
    mapping(uint256 => uint256) private _invoiceAmounts;

    constructor(address initialOwner) ERC721("LiquiFi Invoice NFT", "LINFT") Ownable(initialOwner) {}

    function mint(address to, string memory tokenURI) external onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        return newTokenId;
    }

    function mintWithMetadata(
        address to,
        string memory tokenURI,
        string memory invoiceHash,
        uint256 amount
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = mint(to, tokenURI);
        _invoiceHashes[tokenId] = invoiceHash;
        _invoiceAmounts[tokenId] = amount;
        return tokenId;
    }

    function getInvoiceHash(uint256 tokenId) external view returns (string memory) {
        return _invoiceHashes[tokenId];
    }

    function getInvoiceAmount(uint256 tokenId) external view returns (uint256) {
        return _invoiceAmounts[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIds.current();
    }
}

