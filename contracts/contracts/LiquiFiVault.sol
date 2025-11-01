// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ILiquiFiINFT {
    function getInvoiceAmount(uint256 tokenId) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract LiquiFiVault is Ownable, ReentrancyGuard {
    IERC721 public inft;
    ILiquiFiINFT public inftData;

    struct Loan {
        uint256 tokenId;
        uint256 principal;
        uint256 interestRate;
        uint256 createdAt;
        address borrower;
        bool active;
    }

    mapping(uint256 => Loan) public loans;
    mapping(uint256 => uint256) public tokenToLoanId;
    uint256 public loanCounter;
    
    uint256 public constant LTV_RATIO = 70; // 70% LTV
    uint256 public constant INTEREST_RATE = 10; // 10% annual
    uint256 public constant PRECISION = 100;

    event LoanCreated(
        uint256 indexed loanId,
        uint256 indexed tokenId,
        address indexed borrower,
        uint256 principal
    );
    event LoanRepaid(uint256 indexed loanId, uint256 amount);
    event NFTDeposited(uint256 indexed tokenId);

    constructor(address _inftAddress, address initialOwner) Ownable(initialOwner) {
        inft = IERC721(_inftAddress);
        inftData = ILiquiFiINFT(_inftAddress);
    }

    function depositAndBorrow(uint256 tokenId, uint256 requestedAmount) external nonReentrant returns (uint256) {
        require(inft.ownerOf(tokenId) == msg.sender, "Not token owner");
        
        // Get invoice amount
        uint256 invoiceAmount = inftData.getInvoiceAmount(tokenId);
        require(invoiceAmount > 0, "Invalid invoice");
        
        // Calculate max borrow (70% LTV)
        uint256 maxBorrow = (invoiceAmount * LTV_RATIO) / PRECISION;
        require(requestedAmount <= maxBorrow, "Exceeds LTV");
        
        // Transfer NFT to vault
        inft.safeTransferFrom(msg.sender, address(this), tokenId);
        
        // Create loan
        loanCounter++;
        loans[loanCounter] = Loan({
            tokenId: tokenId,
            principal: requestedAmount,
            interestRate: INTEREST_RATE,
            createdAt: block.timestamp,
            borrower: msg.sender,
            active: true
        });
        
        tokenToLoanId[tokenId] = loanCounter;
        
        emit LoanCreated(loanCounter, tokenId, msg.sender, requestedAmount);
        emit NFTDeposited(tokenId);
        
        return loanCounter;
    }

    function getLoanId(uint256 tokenId) external view returns (uint256) {
        return tokenToLoanId[tokenId];
    }

    function repayLoan(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.active, "Loan not active");
        require(msg.sender == loan.borrower, "Not borrower");
        
        // Calculate interest (simplified: linear for MVP)
        uint256 interest = (loan.principal * loan.interestRate * (block.timestamp - loan.createdAt)) / (PRECISION * 365 days);
        uint256 totalDue = loan.principal + interest;
        
        require(msg.value >= totalDue, "Insufficient payment");
        
        loan.active = false;
        
        // Return NFT to borrower
        inft.safeTransferFrom(address(this), loan.borrower, loan.tokenId);
        
        // Send excess back
        if (msg.value > totalDue) {
            payable(msg.sender).transfer(msg.value - totalDue);
        }
        
        emit LoanRepaid(loanId, totalDue);
    }

    function getLoanDetails(uint256 loanId) external view returns (
        uint256 tokenId,
        uint256 principal,
        uint256 interestRate,
        uint256 createdAt,
        address borrower,
        bool active
    ) {
        Loan memory loan = loans[loanId];
        return (
            loan.tokenId,
            loan.principal,
            loan.interestRate,
            loan.createdAt,
            loan.borrower,
            loan.active
        );
    }
}

