# Variables de Entorno Requeridas para ENS en Mainnet

## 🚨 Variables Críticas (Raíz `.env.local`)

Estas variables deben estar en el archivo `.env.local` en la **raíz del proyecto**:

```bash
# ENS Mainnet - REQUERIDO para registrar subdominios
NEXT_PUBLIC_ENS_REGISTRAR_MAINNET=0x... # Address del contrato ENSSubnameRegistrar desplegado

# Nombre del dominio padre (el que compraste)
ENS_PARENT_NAME=liquifidev.eth

# Alchemy Mainnet API Key - REQUERIDO para transacciones
ALCHEMY_MAINNET_API_KEY=your-mainnet-alchemy-api-key

# Private Key del deployer - REQUERIDO para firmar transacciones
# ⚠️ Debe tener ETH en Mainnet para pagar gas
DEPLOYER_PRIVATE_KEY=0x... # Tu private key (debe tener ETH en Mainnet)
```

## 📝 Variables Opcionales pero Recomendadas

```bash
# Para verificar el dominio en el frontend (opcional)
NEXT_PUBLIC_ENS_PARENT_NAME=liquifidev.eth
```

## 🔧 Variables en `contracts/.env` (Para Deployment)

Estas variables van en el archivo `contracts/.env` **dentro de la carpeta `contracts/`**:

```bash
# Alchemy Mainnet (para deployment y scripts)
ALCHEMY_MAINNET_API_KEY=your-mainnet-alchemy-api-key

# ENS Mainnet Contract Addresses (fijas, no cambian)
ENS_REGISTRY_MAINNET=0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
NAME_WRAPPER_MAINNET=0x0635513f179D50A207757E05759CbD106d7dFcE8
PUBLIC_RESOLVER_MAINNET=0x231b0Ee14048e9dCc81EDc3eBbb310B87753231

# Configuración del dominio padre
ENS_PARENT_NAME=liquifidev.eth
ENS_PARENT_NODE=0x... # Calculado con: npm run calculate-namehash liquifidev.eth

# Private Key para deployment (debe tener ETH en Mainnet)
DEPLOYER_PRIVATE_KEY=0x...
```

## 📋 Checklist de Configuración

### Paso 1: Obtener Alchemy Mainnet API Key
1. Ve a [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Crea una nueva app o usa una existente
3. Selecciona **"Ethereum Mainnet"** como red
4. Copia el API Key

### Paso 2: Calcular ENS_PARENT_NODE

```bash
cd contracts
npm install  # Si no has instalado dependencias
npm run calculate-namehash liquifidev.eth
```

Esto te dará el `ENS_PARENT_NODE` que necesitas.

### Paso 3: Deployar ENSSubnameRegistrar en Mainnet

**IMPORTANTE**: Antes de deployar, asegúrate de que:
- ✅ `liquifidev.eth` está **wrapped** usando NameWrapper
- ✅ Tu wallet deployer tiene **ETH en Mainnet** (para gas)
- ✅ Tu wallet deployer es el **owner** del dominio wrapped

Luego ejecuta:

```bash
cd contracts
npm run deploy:mainnet
```

Esto te dará el address de `ENSSubnameRegistrar`, que es el `NEXT_PUBLIC_ENS_REGISTRAR_MAINNET`.

### Paso 4: Agregar Variables a `.env.local`

Después del deployment, agrega a `.env.local` (raíz):

```bash
# Después del deployment, pega el address que te mostró:
NEXT_PUBLIC_ENS_REGISTRAR_MAINNET=0x... # ← Address del deployment
ENS_PARENT_NAME=liquifidev.eth
ALCHEMY_MAINNET_API_KEY=tu-alchemy-key-aqui
DEPLOYER_PRIVATE_KEY=0x... # Tu private key con ETH en Mainnet
```

### Paso 5: Reiniciar el Servidor

```bash
# Detén el servidor (Ctrl+C)
npm run dev
```

## ✅ Verificación

Después de configurar, prueba:

1. **Verifica que no aparece el warning**:
   ```
   ⚠️ ENS_REGISTRAR_MAINNET not configured, skipping ENS registration
   ```
   Ya no debería aparecer.

2. **Prueba verificar un label**:
   - En el frontend, ingresa un nombre ENS
   - Haz clic en "Verificar"
   - Debería funcionar sin errores

3. **Prueba KYB completo**:
   - Ingresa nombre ENS
   - Ejecuta KYB
   - Si KYB aprobado (score >= 85), debería registrar el subdominio en Mainnet

## 🔍 Troubleshooting

### Error: "ENS_REGISTRAR_MAINNET not configured"
- ✅ Verifica que `NEXT_PUBLIC_ENS_REGISTRAR_MAINNET` está en `.env.local`
- ✅ Verifica que el address es válido (empieza con `0x` y tiene 42 caracteres)
- ✅ Reinicia el servidor después de agregar la variable

### Error: "Missing DEPLOYER_PRIVATE_KEY"
- ✅ Verifica que `DEPLOYER_PRIVATE_KEY` está en `.env.local`
- ✅ Verifica que el private key es válido (empieza con `0x`)

### Error: "Missing ALCHEMY_MAINNET_API_KEY"
- ✅ Verifica que `ALCHEMY_MAINNET_API_KEY` está en `.env.local`
- ✅ Verifica que es una API key válida de Alchemy (Mainnet)

### Error durante registro: "Parent domain not wrapped"
- Ve a [ENS App](https://app.ens.domains/)
- Conecta tu wallet (debe ser owner de `liquifidev.eth`)
- Wrap el dominio usando NameWrapper
- Espera confirmación de transacción

### Error durante registro: "NotOrgOwner"
- Tu wallet deployer debe ser el **owner** del dominio wrapped
- Verifica en [ENS App](https://app.ens.domains/) quién es el owner

## 📊 Costos Estimados

- **Deploy ENSSubnameRegistrar**: ~0.01-0.02 ETH (una vez)
- **Registrar cada subdominio**: ~0.001-0.003 ETH (por empresa)
- **Total por empresa nueva**: ~0.001-0.003 ETH

## 🔐 Seguridad

⚠️ **NUNCA**:
- Compartas tu `DEPLOYER_PRIVATE_KEY`
- Commitees `.env.local` o `contracts/.env` a git
- Expongas las variables de entorno al cliente (solo `NEXT_PUBLIC_*` son públicas)

✅ **SÍ**:
- Usa una wallet dedicada solo para deployment
- Mantén solo ETH suficiente para gas en esa wallet
- Usa variables de entorno para toda la configuración sensible

