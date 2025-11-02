# 🚀 Setup Rápido de ENS - Ejecutar Ahora

## ✅ Lo que ya está listo:
- ✅ ENS_PARENT_NODE calculado y agregado a `contracts/.env`
- ✅ ENS_PARENT_NAME configurado
- ✅ DEPLOYER_PRIVATE_KEY configurado
- ✅ Namehash: `0x70390e6020cabea5ca2eede70a174f6a92df62734139fbdf68d542511f79ccaa`

## ❌ Lo que falta:

### 1. ALCHEMY_MAINNET_API_KEY

**Agrega esto a `.env.local` (raíz):**

```bash
ALCHEMY_MAINNET_API_KEY=tu-alchemy-mainnet-api-key-aqui
```

**Para obtenerla:**
1. Ve a https://dashboard.alchemy.com/
2. Selecciona tu app (o crea una nueva)
3. Red: **Ethereum Mainnet**
4. Copia el API Key

### 2. Desplegar ENSSubnameRegistrar

**El `NEXT_PUBLIC_ENS_REGISTRAR_MAINNET` actualmente apunta a tu wallet**, pero debe apuntar al contrato desplegado.

**Antes de desplegar, verifica:**
- ✅ Tu wallet `0xfc7E092616BF3Af9636B898C51d2C922b0e6DFf7` tiene ETH en Mainnet
- ✅ `liquifidev.eth` está **wrapped** en NameWrapper
- ✅ Tu wallet es el **owner** del dominio wrapped

**Para desplegar:**

```bash
cd contracts

# Agrega ALCHEMY_MAINNET_API_KEY a contracts/.env también
echo "ALCHEMY_MAINNET_API_KEY=tu-key-aqui" >> contracts/.env

# Despliega
npm run deploy:mainnet
```

**Después del deployment**, actualiza `.env.local`:

```bash
# Reemplaza el address actual con el address del contrato que te muestre el script
NEXT_PUBLIC_ENS_REGISTRAR_MAINNET=0x... # ← Address del contrato (no tu wallet)
```

## 📋 Checklist Final:

- [ ] Agregar `ALCHEMY_MAINNET_API_KEY` a `.env.local`
- [ ] Agregar `ALCHEMY_MAINNET_API_KEY` a `contracts/.env`
- [ ] Verificar que `liquifidev.eth` está wrapped
- [ ] Verificar que tu wallet tiene ETH en Mainnet
- [ ] Ejecutar `npm run deploy:mainnet` en `contracts/`
- [ ] Actualizar `NEXT_PUBLIC_ENS_REGISTRAR_MAINNET` en `.env.local` con el address del contrato
- [ ] Reiniciar servidor: `npm run dev`

## ⚡ Comandos Rápidos:

```bash
# 1. Agregar Alchemy key a ambos archivos
echo "ALCHEMY_MAINNET_API_KEY=tu-key" >> .env.local
echo "ALCHEMY_MAINNET_API_KEY=tu-key" >> contracts/.env

# 2. Desplegar contrato
cd contracts
npm run deploy:mainnet

# 3. Copiar el address del contrato y actualizar .env.local
# (Editar manualmente con el address que te muestre)

# 4. Reiniciar servidor
cd ..
npm run dev
```

