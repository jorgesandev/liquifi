# Deployment con USDC Real (Arbitrum Sepolia)

Este documento explica cómo redesplegar el vault para usar **USDC real** de Circle en lugar de MockUSDC.

## ¿Por qué USDC Real?

- ✅ **Mejor presentación técnica** para hackathons
- ✅ **Uso de tokens reales** (aunque en testnet)
- ✅ **Más cercano a producción**
- ✅ **Ya tienes 20 USDC disponibles**

## Dirección de USDC en Arbitrum Sepolia

```
USDC Real (Arbitrum Sepolia): 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

## ✅ Deployment Completado

El vault ya fue redesplegado con **USDC REAL** de Arbitrum Sepolia.

### Direcciones Desplegadas (Arbitrum Sepolia)

- **USDC Real (Asset)**: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- **LiquiFiINFT**: `0x97ceb61b2dB5bEA801C0eEA4Eb75DF0F8B9705E9`
- **LiquidityVault**: `0xEb5637E3ACab6A7945751Ff776A0c84b0875E64f`
- **LoanManager**: `0x2711c7aa0BFc2734227F619CB8198d03FaD9D2C2`

### Variables en `.env.local` (Ya actualizadas)

```bash
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x97ceb61b2dB5bEA801C0eEA4Eb75DF0F8B9705E9
NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0xEb5637E3ACab6A7945751Ff776A0c84b0875E64f
NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=0x2711c7aa0BFc2734227F619CB8198d03FaD9D2C2
```

## Si necesitas redesplegar

### 1. Redesplegar contratos con USDC real

```bash
npm run deploy:arb-usdc
```

O manualmente:
```bash
cd contracts
npx hardhat run scripts/deploy-arb-sepolia-usdc.ts --network arbitrumSepolia
```

### 3. Verificar USDC en tu wallet

Asegúrate de tener USDC real en Arbitrum Sepolia:
- **Faucet**: https://faucet.circle.com/
- **Verificar en Arbiscan**: https://arb-sepolia.arbiscan.io/address/0x75faf114eafb1BDbe2F0316DF893fd58cE87D3a0

### 4. Reiniciar el servidor

```bash
npm run dev
```

## Diferencias con MockUSDC

| Característica | MockUSDC | USDC Real |
|----------------|----------|-----------|
| Contrato | Nuestro contrato | Circle (oficial) |
| Minting | Solo owner puede mintear | No puedes mintear |
| Faucet | No disponible | Circle Faucet |
| Uso en producción | ❌ No | ✅ Sí (mainnet) |
| Presentación técnica | ⭐⭐ | ⭐⭐⭐⭐⭐ |

## Notas Importantes

1. **El vault debe redesplegarse** porque el asset es inmutable (se establece en el constructor)
2. **Los contratos existentes seguirán usando MockUSDC** si no los redesplegas
3. **Los préstamos en curso** no se verán afectados
4. **Para el hackathon**, USDC real se ve mucho más profesional

## ¿Problemas?

Si el deployment falla, verifica:
- ✅ Tienes ETH en Arbitrum Sepolia para gas
- ✅ La dirección de USDC es correcta
- ✅ El contrato USDC existe en Arbitrum Sepolia

