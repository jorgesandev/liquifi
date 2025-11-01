# LiquiFi - Decentralized Invoice Financing Platform

A Next.js Web3 application for invoice financing with **cross-chain architecture**:
- **L1 (Sepolia)**: ENS identity management for verified organizations
- **L2 (Arbitrum Sepolia)**: DeFi protocol with invoice NFTs, ERC-4626 vault, and lending

Users can upload CFDI invoices, mint them as NFTs, and borrow against them through a decentralized vault with real ENS identity verification.

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, TailwindCSS
- **Web3**: wagmi, viem, ethers.js
- **State Management**: TanStack Query, Zustand
- **Database**: Supabase
- **Smart Contracts**: Solidity 0.8.24, Hardhat, OpenZeppelin v5
- **Networks**: Ethereum Sepolia (L1), Arbitrum Sepolia (L2)

## Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Alchemy account with API keys for both Sepolia and Arbitrum Sepolia
- Supabase account
- Private key for contract deployment
- ENS parent name registered and wrapped on Sepolia (e.g., `liquifi-sepolia.eth`)

## Environment Variables

### Root `.env.local`

Create a `.env.local` file in the root directory:

```bash
# Alchemy API Keys (public, used by client)
NEXT_PUBLIC_ALCHEMY_API_KEY=your-arb-sepolia-key
NEXT_PUBLIC_ALCHEMY_POLICY_ID=your-arb-sepolia-policy-id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
# OR use ANON_KEY (alternative):
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# L1: ENS Contract Addresses (set after Sepolia deployment)
NEXT_PUBLIC_ENS_REGISTRAR_SEPOLIA=0x...

# L2: DeFi Contract Addresses (set after Arbitrum Sepolia deployment)
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0x...
NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=0x...

# Private key for server-side transactions (NEVER expose to client)
DEPLOYER_PRIVATE_KEY=your-private-key-here
```

### Contracts `.env`

Create a `.env` file in the `contracts/` directory:

```bash
# L2: Arbitrum Sepolia
ALCHEMY_API_KEY=your-arb-sepolia-key
ALCHEMY_POLICY_ID=your-arb-sepolia-policy-id

# L1: Sepolia (for ENS)
ALCHEMY_SEPOLIA_API_KEY=your-sepolia-key

# Deployment
DEPLOYER_PRIVATE_KEY=your-private-key-here

# L1: ENS Configuration (required for Sepolia deployment)
SEP_ENS_REGISTRY=0x...
SEP_NAME_WRAPPER=0x...
SEP_PUBLIC_RESOLVER=0x...
SEP_PARENT_NAME="liquifi-sepolia.eth"
SEP_PARENT_NODE=0x... # namehash(SEP_PARENT_NAME)
```

**⚠️ Security Note**: Never commit `.env` or `.env.local` files. Private keys should never be exposed to the client.

**📝 ENS Setup**: You need to register and wrap the parent ENS name (`liquifi-sepolia.eth`) on Sepolia before deploying. Use the ENS UI or scripts to:
1. Register the parent name via test registrar
2. Wrap it using NameWrapper
3. Calculate the `namehash` for `SEP_PARENT_NODE`

## Supabase Setup

1. Create a new Supabase project
2. Run the following SQL to create required tables:

```sql
-- Invoices table
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  debtor_name TEXT NOT NULL,
  cfdi_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'uploaded',
  nft_token_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KYB results table
CREATE TABLE kyb_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans table
CREATE TABLE loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES invoices(id),
  token_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_invoices_cfdi_hash ON invoices(cfdi_hash);
CREATE INDEX idx_invoices_nft_token_id ON invoices(nft_token_id);
CREATE INDEX idx_loans_token_id ON loans(token_id);
```

## Installation

1. **Install root dependencies**:
   ```bash
   npm install
   ```

2. **Install contract dependencies**:
   ```bash
   cd contracts
   npm install
   cd ..
   ```

## Contract Deployment

See detailed contract documentation in [`contracts/README_CONTRACTS.md`](./contracts/README_CONTRACTS.md).

### Quick Start

1. **Compile contracts**:
   ```bash
   cd contracts
   npm run compile
   ```

2. **Deploy to Sepolia L1** (ENS Registrar):
   ```bash
   npm run deploy:sepolia
   ```
   
   Outputs: `NEXT_PUBLIC_ENS_REGISTRAR_SEPOLIA` address

3. **Deploy to Arbitrum Sepolia L2** (DeFi Protocol):
   ```bash
   npm run deploy:arb
   ```
   
   Outputs contract addresses for:
   - MockUSDC
   - LiquiFiINFT
   - LiquidityVault (ERC-4626)
   - LoanManager

4. **Copy ABIs to app**:
   ```bash
   npm run copy-abis
   ```

5. **Update `.env.local`** with all deployed contract addresses.

## Running the Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open** [http://localhost:3000](http://localhost:3000)

## Usage Flow

### For Borrowers

1. **Connect Wallet**: Connect your MetaMask (switch to Arbitrum Sepolia)
2. **Upload CFDI**: Upload an XML/PDF invoice file
3. **KYB Verification**: Run mock KYB check (generates score 80-100)
4. **Mint NFT**: Mint the invoice as an NFT (owner-only for MVP)
5. **Initiate Loan**: Call `LoanManager.initiateLoan()` with NFT as collateral
   - Max LTV: 70% of invoice amount
   - Optional: Provide ENS label for authorization check
6. **Repay Loan**: Call `LoanManager.repayLoan()` to return NFT

### For Liquidity Providers

1. **Connect Wallet**: Connect your MetaMask (Arbitrum Sepolia)
2. **Approve USDC**: Approve `LiquidityVault` to spend mUSDC
3. **Deposit**: Call `LiquidityVault.deposit(amount)` to receive vault shares
4. **Withdraw**: Call `LiquidityVault.withdraw(amount)` to redeem shares for USDC

## Project Structure

```
liquifi/
├── app/
│   ├── api/              # API routes (invoices, kyb, mint, borrow)
│   ├── components/       # React components
│   ├── page.tsx          # Main dashboard
│   ├── layout.tsx        # Root layout
│   └── providers.tsx     # Wagmi & Query providers
├── components/           # Shared components
│   ├── ConnectWallet.tsx
│   ├── UploadCFDI.tsx
│   ├── MintInvoice.tsx
│   ├── VaultActions.tsx
│   └── Toast.tsx
├── lib/
│   ├── wagmi.ts          # Wagmi configuration
│   ├── supabase.ts       # Supabase client (server-only)
│   └── contracts.ts      # Contract addresses & ABIs
├── contracts/
│   ├── contracts/        # Solidity contracts
│   │   ├── ENSSubnameRegistrar.sol  # L1: ENS identity
│   │   ├── LiquiFiINFT.sol           # L2: Invoice NFTs
│   │   ├── MockUSDC.sol              # L2: Test token
│   │   ├── LiquidityVault.sol       # L2: ERC-4626 vault
│   │   ├── LoanManager.sol          # L2: Loan orchestration
│   │   └── LiquiFiVault.sol         # Legacy (deprecated)
│   ├── scripts/
│   │   ├── deploy-sepolia.ts        # L1 deployment
│   │   └── deploy-arb-sepolia.ts    # L2 deployment
│   ├── hardhat.config.ts
│   └── README_CONTRACTS.md          # Detailed contract docs
├── scripts/
│   └── copy-abis.js      # ABI copy utility
└── abi/                  # Contract ABIs (generated)
```

## API Routes

- `POST /api/invoices` - Upload and store invoice metadata
- `POST /api/kyb` - Mock KYB verification
- `POST /api/mint` - Mint invoice NFT (server-signed)
- `POST /api/borrow` - Initiate loan via LoanManager (replaces old vault deposit)

## Smart Contracts

See [`contracts/README_CONTRACTS.md`](./contracts/README_CONTRACTS.md) for detailed documentation.

### L1: Sepolia

**ENSSubnameRegistrar**
- Manages ENS subnames under parent name
- Authorizes/revokes organization wallets
- Used for identity verification (optional in MVP)

### L2: Arbitrum Sepolia

**MockUSDC**
- ERC20 token (6 decimals) for testing
- Mintable by owner

**LiquiFiINFT**
- ERC721 NFT for tokenized invoices
- Stores full invoice metadata (debtor, amount, dueDate, URI)
- Owner-only minting (MVP)

**LiquidityVault** (ERC-4626)
- Standard ERC-4626 vault for LP deposits
- Share-based accounting
- Accepts NFTs as collateral (ERC721Receiver)
- Lends funds to borrowers via LoanManager

**LoanManager**
- Orchestrates loans using NFTs as collateral
- Enforces 70% LTV maximum
- Calculates interest (10% annual)
- Handles repayments and liquidations
- Optional ENS authorization check

## Development

- **Lint**: `npm run lint`
- **Build**: `npm run build`
- **Compile contracts**: `npm run compile` (from contracts/)
- **Deploy contracts**: `npm run deploy` (from contracts/)

## Verifying Transactions

LiquiFi is open source. All transactions are publicly verifiable on blockchain explorers.

### Blockchain Explorers

#### Arbitrum Sepolia (L2 - Main Protocol)
- **Arbiscan**: https://sepolia.arbiscan.io/
  - View transactions: `https://sepolia.arbiscan.io/tx/<tx_hash>`
  - View contracts: `https://sepolia.arbiscan.io/address/<contract_address>`
  - Example: https://sepolia.arbiscan.io/tx/0x76cc1c5a69ffc084eccdd62fd060db14e9f8338262905b8c2584d64a994b2d1d

#### Ethereum Sepolia (L1 - ENS Identity)
- **Etherscan**: https://sepolia.etherscan.io/
  - View transactions: `https://sepolia.etherscan.io/tx/<tx_hash>`
  - View contracts: `https://sepolia.etherscan.io/address/<contract_address>`

### Using the Verification Script

We provide a local script to verify transactions and check contract deployment status:

```bash
# Verify a specific transaction
npm run verify-tx <transaction_hash>

# Example
npm run verify-tx 0x76cc1c5a69ffc084eccdd62fd060db14e9f8338262905b8c2584d64a994b2d1d
```

The script will:
- Check transaction status (success/failure)
- Display gas usage
- Show contract deployment status
- Parse and display events
- Provide links to blockchain explorers

### Verifying Contract Deployment

To verify that contracts are properly deployed:

1. Check contract addresses in `.env.local` match deployed addresses
2. Use the verification script (it automatically checks contract deployment)
3. Visit the contract address on Arbiscan/Etherscan
4. Verify contract code is present (not just an EOA)

### Example Contract Addresses (Testnet)

After deployment, your contracts will have addresses like:

```
MockUSDC: 0xa6EA99E4b6eEf5284823DB4A7ad2882480e4cd52
LiquiFiINFT: 0x560648AF179DbB86f45CF0c215a10ee812c0710D
LiquidityVault: 0x6f4bcd6F91402de2a91d743E1e4B2EC9237bDd15
LoanManager: 0xb3503def191F09032576400aBdfDe7aF89126c00
```

View them on Arbiscan to see:
- Contract source code (if verified)
- All transactions
- Events emitted
- Current state (tokens, balances, etc.)

### Open Source Transparency

All smart contract code is open source and auditable:
- Contract source: `contracts/contracts/*.sol`
- Deployment scripts: `contracts/scripts/*.ts`
- Transaction verification: Public on blockchain explorers
- No hidden transactions or backdoors

## Architecture

### Cross-Chain Design

- **L1 (Sepolia)**: ENS identity layer
  - Organizations get real ENS subnames (e.g., `acme.liquifi-sepolia.eth`)
  - Persistent identity across the protocol
  - Optional authorization checks in LoanManager

- **L2 (Arbitrum Sepolia)**: DeFi protocol layer
  - All financial operations (minting, lending, borrowing)
  - Lower gas costs for frequent transactions
  - ERC-4626 vault for efficient capital management

### Security Features

- ReentrancyGuard on all state-changing functions
- Custom errors for gas efficiency
- Input validation (zero address checks, due dates, LTV limits)
- Access control (Ownable, onlyLoanManager)
- ERC721Receiver for safe NFT transfers

## Notes

- MVP implementation uses owner-only minting. In production, add proper access control.
- KYB and invoice validation are **mocked** in MVP. Integrate real services for production.
- ENS integration is optional but recommended for production identity management.
- Contract addresses must be set in `.env.local` after deployment.
- Ensure your wallet has testnet ETH on both Sepolia and Arbitrum Sepolia for transactions.
- The old `LiquiFiVault.sol` is deprecated. Use `LiquidityVault.sol` (ERC-4626) and `LoanManager.sol` instead.

## License

MIT
