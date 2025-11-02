# Setup de ENS para LiquiFi

## Configuración de Mainnet

### 1. Verificar Dominio Padre

El dominio `liquifidev.eth` debe estar:
- ✅ Registrado en Ethereum Mainnet
- ✅ Wrapped usando NameWrapper
- ✅ El deployer wallet debe tener permisos para crear subdominios

### 2. Calcular Namehash

Ejecuta el script para calcular el namehash del dominio padre:

```bash
cd contracts
npm run calculate-namehash liquifidev.eth
```

Esto te dará el `ENS_PARENT_NODE` que necesitas para el deployment.

### 3. Configurar Variables de Entorno

En `contracts/.env`:
```bash
# Mainnet Alchemy
ALCHEMY_MAINNET_API_KEY=your-mainnet-alchemy-key

# ENS Mainnet Addresses (fixed)
ENS_REGISTRY_MAINNET=0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
NAME_WRAPPER_MAINNET=0x0635513f179D50A207757E05759CbD106d7dFcE8
PUBLIC_RESOLVER_MAINNET=0x231b0Ee14048e9dCc81EDc3eBbb310B87753231

# ENS Configuration
ENS_PARENT_NAME=liquifidev.eth
ENS_PARENT_NODE=0x... # Run calculate-namehash script to get this
DEPLOYER_PRIVATE_KEY=your-private-key-with-mainnet-eth
```

En `.env.local` (root):
```bash
# ENS Mainnet
NEXT_PUBLIC_ENS_REGISTRAR_MAINNET=0x... # After deployment
ENS_PARENT_NAME=liquifidev.eth
ALCHEMY_MAINNET_API_KEY=your-mainnet-alchemy-key
```

### 4. Deployar ENSSubnameRegistrar en Mainnet

```bash
cd contracts
npm run deploy:mainnet
```

Este script:
- Verifica que el dominio padre está wrapped
- Despliega `ENSSubnameRegistrar` en Mainnet
- Configura el contrato con el dominio padre

### 5. Ejecutar Migración de Supabase

Ejecuta el SQL en tu Supabase SQL Editor:

```sql
-- Ver archivo: supabase/migrations/add_ens_columns.sql
```

Esto crea:
- Columnas `ens_label`, `ens_registered`, `ens_registered_at` en `kyb_results`
- Tabla `ens_registrations` para tracking

### 6. Verificar Deployment

1. Verifica el contrato en Etherscan
2. Verifica que el contrato tiene permisos en NameWrapper
3. Prueba registrar un subdominio manualmente para verificar

## Flujo de Uso

### Primera vez (nuevo usuario):
1. Usuario sube CFDI → se genera `org_id`
2. Usuario ingresa nombre ENS (ej: "negociomuebles")
3. Sistema valida formato y disponibilidad
4. Usuario ejecuta KYB → se genera score (mock 80-100)
5. **Si KYB aprobado (score >= 85)**:
   - Backend llama `ENSSubnameRegistrar.registerOrg("negociomuebles", ownerAddress)` en Mainnet
   - Transacción se confirma
   - Se guarda en Supabase: `ens_label`, `ens_registered=true`
   - Se muestra: "✅ Subdominio registrado: negociomuebles.liquifidev.eth"
6. Continúa con mint NFT y préstamo

### Próximas veces (usuario existente):
1. Usuario conecta wallet y sube nueva factura
2. Sistema busca `org_id` → encuentra `ens_registered=true`
3. Muestra: "Empresa verificada: negociomuebles.liquifidev.eth"
4. **Omite paso de KYB** (ya está verificado)
5. Va directo a upload CFDI → mint → borrow

## Variables de Entorno Requeridas

### Backend (`.env.local`):
- `NEXT_PUBLIC_ENS_REGISTRAR_MAINNET`: Address del contrato desplegado
- `ENS_PARENT_NAME`: "liquifidev.eth"
- `ALCHEMY_MAINNET_API_KEY`: Para transacciones en Mainnet
- `DEPLOYER_PRIVATE_KEY`: Para firmar transacciones (debe tener ETH en Mainnet)

### Contratos (`contracts/.env`):
- `ALCHEMY_MAINNET_API_KEY`: Para deployment
- `ENS_PARENT_NODE`: Namehash calculado
- `DEPLOYER_PRIVATE_KEY`: Para deployment

## Costos Estimados

- **Deploy ENSSubnameRegistrar**: ~0.01-0.02 ETH (gas)
- **Registrar cada subdominio**: ~0.001-0.003 ETH (gas)
- **Total por empresa nueva**: ~0.001-0.003 ETH

## Troubleshooting

### Error: "Parent domain not wrapped"
- Verifica que `liquifidev.eth` está wrapped en NameWrapper
- Usa la UI de ENS para wrap el dominio

### Error: "NotOrgOwner"
- El deployer wallet debe ser owner del dominio wrapped
- Verifica permisos en NameWrapper

### Error: "AlreadyRegistered"
- El label ya está registrado
- Usuario debe elegir otro nombre

### ENS_REGISTRAR_MAINNET no configurado
- El endpoint `/api/kyb` registrará KYB pero no registrará ENS
- Completa el setup para habilitar registro ENS

## Testing

1. **Test en Mainnet**: Registra un subdominio de prueba
2. **Verifica en Etherscan**: Confirma que la transacción fue exitosa
3. **Verifica en ENS UI**: Ve a app.ens.domains y busca el subdominio
4. **Test end-to-end**: Flujo completo desde frontend

