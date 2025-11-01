# LiquiFi Smart Contracts

## Overview

LiquiFi is a Web3 invoice financing platform that integrates:
- **ENS Identity** (Sepolia L1): Real ENS subnames for verified organizations
- **DeFi Protocol** (Arbitrum Sepolia L2): Invoice NFTs, ERC-4626 vault, and lending

## Network Architecture

- **L1 (Sepolia)**: ENS identity management via `ENSSubnameRegistrar`
- **L2 (Arbitrum Sepolia)**: Core DeFi protocol (NFTs, Vault, Loans)

## Contracts

### L1: Sepolia

#### ENSSubnameRegistrar.sol
- **Purpose**: Manage ENS subnames under a wrapped parent name
- **Features**:
  - Register organization subnames (e.g., `acme.liquifi-sepolia.eth`)
  - Authorize/revoke additional wallets per organization
  - Query authorization status
- **Dependencies**: Requires parent name to be wrapped via NameWrapper
- **Deployment**: `npm run deploy:sepolia`

### L2: Arbitrum Sepolia

#### MockUSDC.sol
- **Purpose**: Test ERC20 token (6 decimals) for L2 operations
- **Features**: Mintable by owner
- **Symbol**: `mUSDC`

#### LiquiFiINFT.sol
- **Purpose**: ERC721 NFT for tokenized invoices
- **Features**:
  - Mint invoices with full metadata (debtor, amount, dueDate, URI)
  - Deactivate invoices
  - Query invoice data
- **Symbol**: `LINFT`

#### LiquidityVault.sol
- **Purpose**: ERC-4626 vault for LP deposits and loan funding
- **Features**:
  - Standard ERC-4626 share-based accounting
  - Lend funds to borrowers (via LoanManager)
  - Record loan repayments
  - Accept NFTs as collateral (ERC721Receiver)
  - Release NFTs after loan repayment
- **Symbol**: `LQFv` (LiquiFi Vault Share)

#### LoanManager.sol
- **Purpose**: Orchestrate loans using invoice NFTs as collateral
- **Features**:
  - Initiate loans (70% LTV max)
  - Optional ENS authorization check
  - Calculate interest (10% annual)
  - Handle repayments
  - Liquidate overdue loans
- **Security**: ReentrancyGuard, input validation, custom errors

## Deployment

### Prerequisites

1. Create `contracts/.env`:
```env
# L1: Sepolia
ALCHEMY_SEPOLIA_API_KEY=your_sepolia_key
SEP_ENS_REGISTRY=0x...
SEP_NAME_WRAPPER=0x...
SEP_PUBLIC_RESOLVER=0x...
SEP_PARENT_NAME="liquifi-sepolia.eth"
SEP_PARENT_NODE=0x... # namehash(SEP_PARENT_NAME)

# L2: Arbitrum Sepolia
ALCHEMY_API_KEY=your_arb_sepolia_key
ALCHEMY_POLICY_ID=optional_policy_id

# Deployment
DEPLOYER_PRIVATE_KEY=0x...
```

2. Register and wrap parent ENS name on Sepolia:
   - Use ENS UI or scripts to register `liquifi-sepolia.eth`
   - Wrap it using NameWrapper
   - Get the `namehash` for `SEP_PARENT_NODE`

### Deploy to Sepolia L1

```bash
cd contracts
npm run deploy:sepolia
```

Output: `ENSSubnameRegistrar` address

### Deploy to Arbitrum Sepolia L2

```bash
cd contracts
npm run deploy:arb
```

Outputs:
- `MockUSDC` address
- `LiquiFiINFT` address
- `LiquidityVault` address
- `LoanManager` address

The script automatically:
1. Deploys all contracts
2. Sets LoanManager in Vault
3. Mints 1M mUSDC to deployer for testing

## Environment Variables for Frontend

After deployment, add to `.env.local`:

```env
# L1: ENS
NEXT_PUBLIC_ENS_REGISTRAR_SEPOLIA=0x...

# L2: DeFi
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0x...
NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=0x...
```

## Contract Interactions

### Typical Flow

1. **Org Registration** (L1):
   - Owner calls `ENSSubnameRegistrar.registerOrg("acme", ownerAddress)`
   - Creates `acme.liquifi-sepolia.eth`

2. **Invoice Minting** (L2):
   - Owner calls `LiquiFiINFT.mintInvoice(to, debtor, amount, dueDate, uri)`
   - Returns tokenId

3. **LP Deposit** (L2):
   - LP approves mUSDC to Vault
   - LP calls `LiquidityVault.deposit(amount)`
   - Receives `LQFv` shares

4. **Loan Initiation** (L2):
   - Borrower approves NFT to LoanManager
   - Calls `LoanManager.initiateLoan(tokenId, amount, "acme")`
   - NFT transferred to Vault, funds lent to borrower

5. **Loan Repayment** (L2):
   - Borrower approves mUSDC to LoanManager
   - Calls `LoanManager.repayLoan(loanId, amount)`
   - NFT returned to borrower

## Security Features

- ReentrancyGuard on state-changing functions
- Custom errors for gas efficiency
- Input validation (zero address, due dates, LTV)
- Access control (Ownable, onlyLoanManager)
- ERC721Receiver for safe NFT transfers

## Notes

- KYB and invoice validation are **mocked** in MVP
- Interest calculation: simple linear (principal * rate * time / 365 days)
- No fees in MVP
- Grace period: 2 days after invoice due date
- Max LTV: 70%

## ABI Copy Script

After deployment, copy ABIs to frontend:

```bash
npm run copy-abis
```

This copies ABIs from `contracts/artifacts` to `/abi` for frontend use.

## Verifying Transactions

### Blockchain Explorers

**Arbitrum Sepolia (L2)**:
- Arbiscan: https://sepolia.arbiscan.io/
  - Transaction: `https://sepolia.arbiscan.io/tx/<tx_hash>`
  - Contract: `https://sepolia.arbiscan.io/address/<contract_address>`

**Ethereum Sepolia (L1 - ENS)**:
- Etherscan: https://sepolia.etherscan.io/
  - Transaction: `https://sepolia.etherscan.io/tx/<tx_hash>`
  - Contract: `https://sepolia.etherscan.io/address/<contract_address>`

### Verification Script

Use the provided script to verify transactions and contract deployment:

```bash
# From project root
npm run verify-tx <transaction_hash>
```

The script checks:
- Transaction status and gas usage
- Contract deployment status
- Event logs
- Provides explorer links

### Contract Verification

To verify contract source code on explorers:

1. Get contract address from deployment output
2. Visit Arbiscan/Etherscan for that address
3. Click "Contract" tab
4. Click "Verify and Publish" (if not already verified)
5. Upload source code or use Hardhat plugin

This enables public viewing of contract source code, making the protocol fully transparent.

