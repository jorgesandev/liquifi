# Actualizar Direcciones de Contratos

## ⚠️ Problema Detectado

Las direcciones de contratos en `.env.local` están incorrectas:
- `NEXT_PUBLIC_MOCK_USDC_ADDRESS` apunta al ENS Registrar de Mainnet (debe ser MockUSDC en Arbitrum Sepolia)
- `NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS` está malformada

## 🔧 Solución

### Opción 1: Actualizar Manualmente

Edita `.env.local` y actualiza estas líneas con las direcciones correctas:

```bash
# MockUSDC en Arbitrum Sepolia (dirección conocida)
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0x3fD487CbdC35dDbD402babdDD06Ce80327Dc5fd7

# LiquidityVault (NECESITAS LA DIRECCIÓN CORRECTA)
NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0x...

# LiquiFiINFT (verificar si 0x560648AF179DbB86f45CF0c215a10ee812c0710D es correcta)
NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x560648AF179DbB86f45CF0c215a10ee812c0710D

# LoanManager (NECESITAS LA DIRECCIÓN CORRECTA)
NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=0xb3503def191F09032576400aBdfDe7aF89126c00
```

### Opción 2: Redesplegar Contratos

Si no tienes las direcciones correctas, redesplega:

```bash
cd contracts
npm run deploy:arb-sepolia-mockusdc
```

El script mostrará las nuevas direcciones. Cópialas a `.env.local`.

### Opción 3: Verificar en Arbiscan

1. Ve a https://arbiscan.io/
2. Busca las transacciones del deployer wallet
3. Encuentra los contratos desplegados recientemente
4. Copia las direcciones a `.env.local`

## ✅ Después de Actualizar

1. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Verifica que los botones funcionen:
   - `/invest` - Botón "Depositar"
   - `/borrow` - Botón "Deposit & Borrow"

## 📝 Notas

- La dirección de MockUSDC conocida: `0x3fD487CbdC35dDbD402babdDD06Ce80327Dc5fd7`
- Todas las direcciones deben ser de Arbitrum Sepolia (chainId: 421614)
- Las direcciones deben tener el formato checksum correcto (mayúsculas/minúsculas)

