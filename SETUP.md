# Deployer Private Key Setup

## What is the Deployer Private Key?

The deployer private key is used to:
- Deploy smart contracts to Arbitrum Sepolia
- Sign server-side transactions (minting NFTs, borrowing)
- Pay for gas fees on-chain

**⚠️ CRITICAL: Never share this key or commit it to git!**

## Option 1: Extract from MetaMask (Recommended for Testing)

1. Open MetaMask
2. Click on the account you want to use
3. Click the three dots menu → "Account details"
4. Click "Show private key"
5. Enter your password
6. Copy the private key (it's a long hex string starting with `0x`)

**Warning**: Only use a test wallet with testnet funds. Never use a wallet with real funds or your main account!

## Option 2: Generate a New Wallet (Easiest)

Use the provided script to generate a new wallet:

```bash
npm run generate-wallet
```

This will output:
- A new private key
- The wallet address  
- Instructions to add it to `.env.local`

⚠️ **Remember**: You'll need to fund this wallet with testnet ETH!

### Alternative: Manual Generation

You can also generate manually:
```bash
# Using Node.js
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

Or use tools like:
- https://vanity-eth.tk/
- https://www.myetherwallet.com/create-wallet

## Option 3: Use Hardhat's Generated Account

When running Hardhat locally, it provides test accounts. However, for deployment you need a real account with funds.

## Funding Your Deployer Wallet

After you have the private key, make sure the wallet address has:
- Arbitrum Sepolia ETH (for gas fees)
- Get testnet ETH from: https://faucet.quicknode.com/arbitrum/sepolia or https://faucet.circle.com/

## Adding to .env Files

### Root `.env.local`:
```bash
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere
```

### `contracts/.env`:
```bash
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere
```

## Security Best Practices

1. ✅ Use a separate wallet for development/testing
2. ✅ Never commit `.env` files
3. ✅ Only fund with testnet tokens
4. ✅ Use environment variables, never hardcode
5. ❌ Never share private keys
6. ❌ Never use production wallets for testing

