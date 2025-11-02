// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LiquiFiINFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIds;

    struct InvoiceData {
        address issuer;
        string debtor;
        uint256 amount;
        uint256 dueDate;
        string metadataURI;
        bool active;
    }

    mapping(uint256 => InvoiceData) public invoices;
    mapping(uint256 => string) private _invoiceHashes;

    event InvoiceMinted(
        uint256 indexed tokenId,
        address indexed to,
        address indexed issuer,
        string debtor,
        uint256 amount,
        uint256 dueDate
    );
    event InvoiceDeactivated(uint256 indexed tokenId);

    error InvalidDueDate();
    error ZeroAddress();
    error InvoiceNotActive();
    error TokenNotFound();

    constructor(address initialOwner) ERC721("LiquiFi Invoice NFT", "LINFT") Ownable(initialOwner) {}

    /**
     * @dev Mint a new invoice NFT with full metadata
     */
    function mintInvoice(
        address to,
        string memory debtor,
        uint256 amount,
        uint256 dueDate,
        string memory metadataURI
    ) external onlyOwner nonReentrant returns (uint256 tokenId) {
        if (to == address(0)) revert ZeroAddress();
        if (dueDate <= block.timestamp) revert InvalidDueDate();

        _tokenIds++;
        tokenId = _tokenIds;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        invoices[tokenId] = InvoiceData({
            issuer: msg.sender,
            debtor: debtor,
            amount: amount,
            dueDate: dueDate,
            metadataURI: metadataURI,
            active: true
        });

        emit InvoiceMinted(tokenId, to, msg.sender, debtor, amount, dueDate);
        return tokenId;
    }

    /**
     * @dev Mint invoice with CFDI hash (legacy support)
     */
    function mintWithMetadata(
        address to,
        string memory tokenURI,
        string memory invoiceHash,
        uint256 amount
    ) external onlyOwner nonReentrant returns (uint256) {
        if (to == address(0)) revert ZeroAddress();

        _tokenIds++;
        uint256 tokenId = _tokenIds;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        // Set a default due date (30 days from now)
        uint256 dueDate = block.timestamp + 30 days;

        invoices[tokenId] = InvoiceData({
            issuer: msg.sender,
            debtor: "",
            amount: amount,
            dueDate: dueDate,
            metadataURI: tokenURI,
            active: true
        });

        _invoiceHashes[tokenId] = invoiceHash;

        emit InvoiceMinted(tokenId, to, msg.sender, "", amount, dueDate);
        return tokenId;
    }

    /**
     * @dev Deactivate an invoice (mark as paid or invalid)
     */
    function deactivate(uint256 tokenId) external onlyOwner {
        if (ownerOf(tokenId) == address(0)) revert TokenNotFound();
        invoices[tokenId].active = false;
        emit InvoiceDeactivated(tokenId);
    }

    /**
     * @dev Get full invoice data
     */
    function getInvoice(uint256 tokenId) external view returns (InvoiceData memory) {
        try this.ownerOf(tokenId) returns (address) {} catch {
            revert TokenNotFound();
        }
        return invoices[tokenId];
    }

    /**
     * @dev Legacy function - get invoice hash
     */
    function getInvoiceHash(uint256 tokenId) external view returns (string memory) {
        return _invoiceHashes[tokenId];
    }

    /**
     * @dev Legacy function - get invoice amount
     */
    function getInvoiceAmount(uint256 tokenId) external view returns (uint256) {
        try this.ownerOf(tokenId) returns (address) {} catch {
            revert TokenNotFound();
        }
        return invoices[tokenId].amount;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIds;
    }
}

