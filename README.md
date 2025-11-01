# LiquiFi - Decentralized Invoice Financing Platform

A Next.js Web3 application for invoice financing built on Arbitrum Sepolia. Users can upload CFDI invoices, mint them as NFTs, and borrow against them through a decentralized vault.

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, TailwindCSS
- **Web3**: wagmi, viem, ethers.js
- **State Management**: TanStack Query, Zustand
- **Database**: Supabase
- **Smart Contracts**: Solidity, Hardhat, OpenZeppelin
- **Chain**: Arbitrum Sepolia

## Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Alchemy account with Arbitrum Sepolia API key
- Supabase account
- Private key for contract deployment

## Environment Variables

### Root `.env.local`

Create a `.env.local` file in the root directory:

```bash
# Alchemy RPC URL (public, used by client)
NEXT_PUBLIC_ALCHEMY_API_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Supabase (public URL, service role key for server only)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Contract Addresses (set after deployment)
NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0x...

# Private key for server-side transactions (NEVER expose to client)
DEPLOYER_PRIVATE_KEY=your-private-key-here
```

### Contracts `.env`

Create a `.env` file in the `contracts/` directory:

```bash
ALCHEMY_API_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY
DEPLOYER_PRIVATE_KEY=your-private-key-here
```

**⚠️ Security Note**: Never commit `.env` or `.env.local` files. Private keys should never be exposed to the client.

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

1. **Compile contracts**:
   ```bash
   cd contracts
   npm run compile
   ```

2. **Deploy to Arbitrum Sepolia**:
   ```bash
   npm run deploy
   ```

   This will output contract addresses. Add them to your `.env.local`:
   ```
   NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0x...
   ```

3. **Copy ABIs to app**:
   ```bash
   npm run copy-abis
   ```

## Running the Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open** [http://localhost:3000](http://localhost:3000)

## Usage Flow

1. **Connect Wallet**: Connect your MetaMask or injected wallet (must be on Arbitrum Sepolia)
2. **Upload CFDI**: Upload an XML/PDF invoice file
3. **KYB Verification**: Run mock KYB check (generates score 80-100)
4. **Mint NFT**: Mint the invoice as an NFT (owner-only for MVP)
5. **Borrow**: Deposit NFT into vault and borrow up to 70% of invoice value

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
│   │   ├── LiquiFiINFT.sol
│   │   └── LiquiFiVault.sol
│   ├── scripts/
│   │   └── deploy.ts      # Deployment script
│   └── hardhat.config.ts
├── scripts/
│   └── copy-abis.js      # ABI copy utility
└── abi/                  # Contract ABIs (generated)
```

## API Routes

- `POST /api/invoices` - Upload and store invoice metadata
- `POST /api/kyb` - Mock KYB verification
- `POST /api/mint` - Mint invoice NFT (server-signed)
- `POST /api/borrow` - Deposit NFT and borrow from vault

## Smart Contracts

### LiquiFiINFT
- ERC721 NFT for invoices
- Owner-only minting (MVP)
- Stores invoice metadata (hash, amount)

### LiquiFiVault
- Receives NFTs as collateral
- Lends up to 70% LTV
- 10% annual interest rate
- Loan repayment and NFT redemption

## Development

- **Lint**: `npm run lint`
- **Build**: `npm run build`
- **Compile contracts**: `npm run compile` (from contracts/)
- **Deploy contracts**: `npm run deploy` (from contracts/)

## Notes

- MVP implementation uses owner-only minting. In production, add proper access control.
- KYB is mocked with random scores. Integrate real KYB service for production.
- Contract addresses must be set in `.env.local` after deployment.
- Ensure your wallet has Arbitrum Sepolia ETH for transactions.

## License

MIT
