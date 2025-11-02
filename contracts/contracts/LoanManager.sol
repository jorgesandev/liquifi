// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./LiquiFiINFT.sol";
import "./LiquidityVault.sol";

interface IENSSubnameRegistrar {
    function isAuthorized(string memory ensLabel, address wallet) external view returns (bool);
}

contract LoanManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    LiquidityVault public immutable vault;
    LiquiFiINFT public immutable inft;
    IERC20 public immutable asset;

    uint256 public constant MAX_LTV_BPS = 7000; // 70%
    uint256 public constant GRACE_PERIOD = 2 days;

    struct Loan {
        address borrower;
        uint256 tokenId;
        uint256 principal;
        uint256 approvedValue;
        uint256 ltvBps;
        uint256 interestBps;
        uint256 start;
        uint256 due;
        bool active;
    }

    mapping(uint256 => Loan) public loans; // loanId => Loan
    mapping(uint256 => uint256) public tokenToLoanId; // tokenId => loanId
    uint256 public loanCounter;

    address public ensRegistrarSepolia; // Optional ENS registrar on Sepolia L1

    event LoanInitiated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 indexed tokenId,
        uint256 principal,
        uint256 dueDate
    );
    event LoanRepaid(uint256 indexed loanId, address indexed payer, uint256 amount);
    event LoanLiquidated(uint256 indexed loanId, address indexed liquidator);
    event ENSRegistrarSet(address indexed registrar);

    error InvalidLoan();
    error LoanNotActive();
    error NotBorrower();
    error InsufficientLTV();
    error PastDueDate();
    error NotPastDue();
    error TokenNotDeposited();

    constructor(
        address _vault,
        address _inft,
        address _asset,
        address _ensRegistrarSepolia,
        address initialOwner
    ) Ownable(initialOwner) {
        vault = LiquidityVault(_vault);
        inft = LiquiFiINFT(_inft);
        asset = IERC20(_asset);
        ensRegistrarSepolia = _ensRegistrarSepolia;
    }

    /**
     * @dev Set ENS registrar address (optional, can be address(0))
     */
    function setENSRegistrar(address _ensRegistrar) external onlyOwner {
        ensRegistrarSepolia = _ensRegistrar;
        emit ENSRegistrarSet(_ensRegistrar);
    }

    /**
     * @dev Initiate a loan using an invoice NFT as collateral
     * @param tokenId The invoice NFT token ID
     * @param requestedAmount The amount to borrow
     * @param ensLabel Optional ENS label for authorization check
     */
    function initiateLoan(
        uint256 tokenId,
        uint256 requestedAmount,
        string memory ensLabel
    ) external nonReentrant returns (uint256 loanId) {
        // Verify token ownership
        if (inft.ownerOf(tokenId) != msg.sender) revert NotBorrower();

        // Get invoice data
        LiquiFiINFT.InvoiceData memory invoice = inft.getInvoice(tokenId);
        if (!invoice.active) revert InvalidLoan();

        // Check if past due date
        if (block.timestamp > invoice.dueDate) revert PastDueDate();

        // Optional: Check ENS authorization if registrar is set and label provided
        if (ensRegistrarSepolia != address(0) && bytes(ensLabel).length > 0) {
            IENSSubnameRegistrar registrar = IENSSubnameRegistrar(ensRegistrarSepolia);
            if (!registrar.isAuthorized(ensLabel, msg.sender)) {
                revert NotBorrower();
            }
        }

        // Calculate LTV and max borrow
        uint256 maxBorrow = (invoice.amount * MAX_LTV_BPS) / 10000;
        if (requestedAmount > maxBorrow) revert InsufficientLTV();

        // Check if tokenId already has an active loan
        if (tokenToLoanId[tokenId] != 0) {
            uint256 existingLoanId = tokenToLoanId[tokenId];
            Loan storage existingLoan = loans[existingLoanId];
            if (existingLoan.active) {
                revert InvalidLoan(); // Token already has active loan
            }
        }

        // Transfer NFT to vault (as collateral)
        inft.safeTransferFrom(msg.sender, address(vault), tokenId);

        // Create loan
        loanCounter++;
        loanId = loanCounter;

        // Calculate due date (loan due date = invoice due date + grace period)
        uint256 loanDueDate = invoice.dueDate + GRACE_PERIOD;

        loans[loanId] = Loan({
            borrower: msg.sender,
            tokenId: tokenId,
            principal: requestedAmount,
            approvedValue: invoice.amount,
            ltvBps: MAX_LTV_BPS,
            interestBps: 1000, // 10% annual
            start: block.timestamp,
            due: loanDueDate,
            active: true
        });

        tokenToLoanId[tokenId] = loanId;

        // Lend funds from vault to borrower
        vault.lendTo(msg.sender, requestedAmount);

        emit LoanInitiated(loanId, msg.sender, tokenId, requestedAmount, loanDueDate);
        return loanId;
    }

    /**
     * @dev Repay a loan
     * @param loanId The loan ID to repay
     * @param amount The amount to repay (should include interest)
     */
    function repayLoan(uint256 loanId, uint256 amount) external nonReentrant {
        Loan storage loan = loans[loanId];
        if (!loan.active) revert LoanNotActive();
        if (msg.sender != loan.borrower) revert NotBorrower();

        // Calculate interest (for future use)
        uint256 interest = calculateInterest(loanId);
        // For MVP, we require at least principal repayment
        if (amount < loan.principal) revert InsufficientLTV();

        // Transfer payment to vault
        asset.safeTransferFrom(msg.sender, address(vault), amount);

        // Record repayment in vault
        vault.recordRepay(msg.sender, loan.principal);

        // Mark loan as inactive
        loan.active = false;

        // Return NFT to borrower via vault
        vault.releaseNFT(address(inft), loan.tokenId, loan.borrower);

        emit LoanRepaid(loanId, msg.sender, amount);
    }

    /**
     * @dev Liquidate a loan that is past due
     * @param loanId The loan ID to liquidate
     */
    function liquidateLoan(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        if (!loan.active) revert LoanNotActive();
        if (block.timestamp <= loan.due) revert NotPastDue();

        // Mark as inactive
        loan.active = false;

        // NFT remains with vault (or can be transferred to liquidator)
        // In MVP, NFT stays in vault

        emit LoanLiquidated(loanId, msg.sender);
    }

    /**
     * @dev Calculate interest for a loan
     * @param loanId The loan ID
     * @return interest The interest amount
     */
    function calculateInterest(uint256 loanId) public view returns (uint256 interest) {
        Loan memory loan = loans[loanId];
        if (!loan.active) return 0;

        uint256 timeElapsed = block.timestamp - loan.start;
        // Simple interest: principal * rate * time / (10000 * 365 days)
        interest = (loan.principal * loan.interestBps * timeElapsed) / (10000 * 365 days);
    }

    /**
     * @dev Get loan details
     */
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    /**
     * @dev Get loan ID for a token
     */
    function getLoanId(uint256 tokenId) external view returns (uint256) {
        return tokenToLoanId[tokenId];
    }
}

