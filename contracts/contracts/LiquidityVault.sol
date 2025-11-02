// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LiquidityVault is ERC4626, Ownable, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;
    address public loanManager;
    uint256 public totalReceivables;

    event LoanOut(address indexed borrower, uint256 amount);
    event LoanRepaid(address indexed payer, uint256 amount);
    event LoanManagerSet(address indexed newLoanManager);
    event NFTReleased(address indexed nftContract, uint256 indexed tokenId, address indexed to);

    error NotLoanManager();
    error InsufficientLiquidity();

    modifier onlyLoanManager() {
        if (msg.sender != loanManager) revert NotLoanManager();
        _;
    }

    constructor(address asset, address initialOwner)
        ERC4626(IERC20Metadata(asset))
        ERC20("LiquiFi Vault Share", "LQFv")
        Ownable(initialOwner)
    {}

    /**
     * @dev Set the loan manager address
     */
    function setLoanManager(address _loanManager) external onlyOwner {
        loanManager = _loanManager;
        emit LoanManagerSet(_loanManager);
    }

    /**
     * @dev Override totalAssets to include receivables
     */
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + totalReceivables;
    }

    /**
     * @dev Lend funds to a borrower (called by LoanManager)
     * @param borrower The address receiving the loan
     * @param amount The amount to lend
     */
    function lendTo(address borrower, uint256 amount) external onlyLoanManager nonReentrant {
        uint256 available = IERC20(asset()).balanceOf(address(this));
        if (available < amount) revert InsufficientLiquidity();

        // Use SafeERC20 for secure token transfer
        // Note: safeTransfer will revert if transfer fails (e.g., insufficient balance)
        IERC20(asset()).safeTransfer(borrower, amount);
        totalReceivables += amount;

        emit LoanOut(borrower, amount);
    }

    /**
     * @dev Record a loan repayment (called by LoanManager)
     * @param payer The address repaying
     * @param amount The amount being repaid
     */
    function recordRepay(address payer, uint256 amount) external onlyLoanManager nonReentrant {
        // Transfer from payer to vault using SafeERC20
        IERC20(asset()).safeTransferFrom(payer, address(this), amount);

        // Decrease receivables (LoanManager should track which loans are being repaid)
        // For MVP, we decrease by the full amount (LoanManager handles the accounting)
        if (totalReceivables >= amount) {
            totalReceivables -= amount;
        } else {
            totalReceivables = 0;
        }

        emit LoanRepaid(payer, amount);
    }

    /**
     * @dev Release an NFT from the vault (called by LoanManager after loan repayment)
     * @param nftContract The NFT contract address
     * @param tokenId The token ID to release
     * @param to The address to send the NFT to
     */
    function releaseNFT(address nftContract, uint256 tokenId, address to) external onlyLoanManager nonReentrant {
        IERC721(nftContract).safeTransferFrom(address(this), to, tokenId);
        emit NFTReleased(nftContract, tokenId, to);
    }

    /**
     * @dev ERC721Receiver implementation - accept NFTs as collateral
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @dev Override to prevent direct asset transfers that bypass the vault
     */
    function recoverERC20(address token, uint256 amount) external onlyOwner {
        if (token == asset()) {
            // Can't recover the asset token directly
            revert("Cannot recover asset token");
        }
        IERC20(token).transfer(owner(), amount);
    }
}

