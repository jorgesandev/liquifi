# Cómo Agregar MockUSDC a MetaMask

Después de redesplegar con MockUSDC, necesitas agregar el token a MetaMask para poder verlo y usarlo.

## Pasos para Agregar MockUSDC a MetaMask

### 1. Obtener la Dirección del Contrato

Después del deployment, el script mostrará algo como:
```
MockUSDC (Asset): 0x...
```

**Dirección actual (más reciente):**
```
0xDE48174b75cCA16AA4ec3b357e9526748145BBb9
```

Copia esa dirección.

### 2. Agregar Token en MetaMask

1. Abre MetaMask
2. Asegúrate de estar en **Arbitrum Sepolia** network
3. En la parte inferior de la lista de tokens, haz clic en **"Import tokens"**
4. Pega la dirección del contrato MockUSDC
5. MetaMask debería detectar automáticamente:
   - **Token Symbol**: `mUSDC`
   - **Token Decimal**: `6`
6. Haz clic en **"Add custom token"**
7. Confirma la adición

### 3. Verificar el Token

- El token aparecerá como **mUSDC** en tu wallet
- Si el deployer minteó tokens a tu dirección, deberías ver el balance

## Mintear más MockUSDC

Puedes usar el endpoint `/api/mint-musdc` para mintear más tokens a cualquier dirección:

```bash
curl -X POST http://localhost:3000/api/mint-musdc \
  -H "Content-Type: application/json" \
  -d '{
    "address": "TU_DIRECCION_AQUI",
    "amount": "1000"
  }'
```

O desde el frontend, el componente `RequestMUSDC` debería tener un botón para esto.

## Información del Token

- **Nombre**: Mock USDC
- **Símbolo**: mUSDC
- **Decimales**: 6 (igual que USDC real)
- **Red**: Arbitrum Sepolia
- **Tipo**: ERC-20 estándar

## Notas

- Este es un token de prueba, no tiene valor real
- Solo funciona en Arbitrum Sepolia testnet
- Puedes mintear tanto como necesites para el demo

