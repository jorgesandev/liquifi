# Implementación de Registro ENS Subdominios para KYB

## 📋 Resumen

Se implementó un sistema completo de registro automático de subdominios ENS (ej: `negociomuebles.liquifidev.eth`) cuando una empresa pasa la validación KYB por primera vez. En préstamos futuros, si la empresa ya tiene subdominio registrado, el sistema omite el paso de KYB.

## 🎯 Objetivo

- **Primera vez**: Cuando una empresa pasa KYB, registrarle automáticamente un subdominio ENS en Mainnet
- **Próximas veces**: Si la empresa ya tiene ENS registrado, omitir KYB y permitir préstamos directos

## 🏗️ Arquitectura

### Componentes Implementados

1. **Frontend**: Componente `KYBVerification.tsx` con input para nombre de usuario ENS
2. **Backend APIs**:
   - `/api/kyb` - Registro ENS cuando KYB aprobado
   - `/api/ens/check-label` - Verificación de disponibilidad de label
3. **Base de Datos**: Tablas y columnas en Supabase para tracking ENS
4. **Contratos**: Deployment de `ENSSubnameRegistrar` en Mainnet (opcional, se usa NameWrapper directo)

### Red Utilizada

- **Ethereum Mainnet**: Para registro de subdominios ENS bajo `liquifidev.eth`
- **Arbitrum Sepolia**: Para DeFi (NFTs, préstamos, vault) - sin cambios

## 📝 Cambios Realizados

### 1. Base de Datos (Supabase)

**Migración SQL**: `supabase/migrations/add_ens_columns.sql`

```sql
-- Columnas agregadas a kyb_results
ALTER TABLE kyb_results 
ADD COLUMN ens_label TEXT UNIQUE,
ADD COLUMN ens_registered BOOLEAN DEFAULT FALSE,
ADD COLUMN ens_registered_at TIMESTAMPTZ;

-- Nueva tabla para tracking
CREATE TABLE ens_registrations (
  id UUID PRIMARY KEY,
  org_id TEXT NOT NULL,
  ens_label TEXT NOT NULL UNIQUE,
  full_domain TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  tx_hash TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Frontend

**Archivo**: `components/KYBVerification.tsx` (nuevo)

- Input para nombre de usuario ENS (similar a Instagram)
- Validación en tiempo real de formato (alfanumérico, guiones, longitud)
- Botón para verificar disponibilidad antes de enviar
- Preview del dominio completo: `{username}.liquifidev.eth`
- Estado visual cuando ENS está registrado

**Integración**: `app/borrow/page.tsx`
- Reemplazó el botón simple de KYB con el componente completo
- Manejo de callbacks y toasts

### 3. Backend APIs

**Archivo**: `app/api/kyb/route.ts`

Cambios principales:
- Recibe `ens_label` y `owner_address` en el request
- Valida formato del label
- Verifica que el label no esté ya registrado
- Si KYB aprobado (score >= 85) y es primera vez:
  - Llama directamente a `NameWrapper.setSubnodeRecord()` en Mainnet
  - Crea el subdominio: `{label}.liquifidev.eth`
  - Guarda `ens_label`, `ens_registered=true` en Supabase
  - Guarda registro en `ens_registrations`
- Si ya tiene `ens_registered=true`, retorna datos existentes sin registrar

**Archivo**: `app/api/ens/check-label/route.ts` (nuevo)

- Endpoint para verificar disponibilidad de label antes de registrar
- Valida formato y verifica en Supabase si ya existe

**Archivo**: `app/api/borrow/route.ts`

- Verifica si `org_id` tiene `ens_registered=true` en Supabase
- Si tiene ENS, muestra información y omite validaciones adicionales
- Pasa `ens_label` al contrato `LoanManager` (opcional, para verificación)

### 4. Contratos

**Scripts de Deployment**:
- `contracts/scripts/calculate-namehash.ts` - Calcula namehash de dominios ENS
- `contracts/scripts/deploy-mainnet.ts` - Deploy de `ENSSubnameRegistrar` en Mainnet
- `contracts/scripts/approve-ens-contract.ts` - Aprobar contrato para crear subdominios (no usado finalmente)

**Configuración**:
- `contracts/hardhat.config.ts` - Agregada red `mainnet`
- `contracts/package.json` - Scripts npm agregados

**Nota**: Finalmente se usa llamada directa a NameWrapper desde el backend en lugar del contrato, debido a problemas de permisos.

### 5. Variables de Entorno

**`.env.local` (raíz)**:
```bash
# ENS Mainnet
NEXT_PUBLIC_ENS_REGISTRAR_MAINNET=0xa6EA99E4b6eEf5284823DB4A7ad2882480e4cd52
ENS_PARENT_NAME=liquifidev.eth
ENS_PARENT_NODE=0x70390e6020cabea5ca2eede70a174f6a92df62734139fbdf68d542511f79ccaa
ALCHEMY_MAINNET_API_KEY=gkuW9Fqbyb7-to0mEFOBf
DEPLOYER_PRIVATE_KEY=0x... # Debe tener ETH en Mainnet
```

**`contracts/.env`**:
```bash
ALCHEMY_MAINNET_API_KEY=gkuW9Fqbyb7-to0mEFOBf
ENS_PARENT_NODE=0x70390e6020cabea5ca2eede70a174f6a92df62734139fbdf68d542511f79ccaa
ENS_PARENT_NAME=liquifidev.eth
DEPLOYER_PRIVATE_KEY=0x...
```

## 🔄 Flujo de Usuario

### Primera Vez (Nuevo Usuario)

1. Usuario sube factura CFDI → se genera `org_id`
2. Usuario ingresa nombre ENS (ej: "mueblesgdl")
3. Sistema valida formato (alfanumérico, 3-50 caracteres)
4. Usuario hace clic en "Verificar" → sistema verifica disponibilidad en Supabase
5. Usuario ejecuta KYB → se genera score mock (80-100)
6. **Si KYB aprobado (score >= 85)**:
   - Backend llama `NameWrapper.setSubnodeRecord()` en Mainnet
   - Transacción se confirma (~15 segundos)
   - Se guarda en Supabase: `ens_label`, `ens_registered=true`
   - Se muestra: "✅ Subdominio registrado: mueblesgdl.liquifidev.eth"
7. Continúa con mint NFT y préstamo

### Próximas Veces (Usuario Existente)

1. Usuario conecta wallet y sube nueva factura
2. Sistema busca `org_id` en Supabase
3. Si encuentra `ens_registered=true`:
   - Muestra: "Empresa verificada: mueblesgdl.liquifidev.eth"
   - **Omite paso de KYB**
   - Va directo a upload CFDI → mint → borrow

## 🛠️ Setup y Deployment

### Prerrequisitos

1. Dominio `liquifidev.eth` registrado en Mainnet
2. Dominio wrapped usando NameWrapper
3. Wallet deployer con ETH en Mainnet (~0.01 ETH para gas)
4. Alchemy API key para Mainnet habilitada

### Pasos de Setup

1. **Ejecutar migración SQL en Supabase**:
   - Ver archivo `supabase/migrations/add_ens_columns.sql`

2. **Calcular namehash del dominio padre**:
   ```bash
   cd contracts
   npm run calculate-namehash liquifidev.eth
   ```

3. **Configurar variables de entorno**:
   - Ver `VARIABLES_ENTORNO_ENS.md` para detalles completos

4. **Deployar contrato (opcional)**:
   ```bash
   cd contracts
   npm run deploy:mainnet
   ```
   Nota: Actualmente no se usa el contrato, se llama directamente a NameWrapper.

### Deployment del Contrato

El contrato `ENSSubnameRegistrar` fue desplegado en Mainnet:
- **Address**: `0xa6EA99E4b6eEf5284823DB4A7ad2882480e4cd52`
- **TX**: https://etherscan.io/tx/0x0652b2f068c2f75d56459b1cdf70ccb455492ad0070c7eeba5c7fb1ecd4dea73

**Nota**: Actualmente el backend llama directamente a NameWrapper, no usa este contrato. El contrato podría ser útil en el futuro para lógica adicional.

## 🔍 Validaciones Implementadas

### Formato de ENS Label

- Mínimo 3 caracteres, máximo 50
- Solo letras minúsculas, números y guiones
- No puede empezar o terminar con guión
- No puede tener guiones consecutivos
- Normalización automática a minúsculas

### Verificación de Disponibilidad

- Verifica en Supabase antes de registrar
- Previene duplicados
- Muestra preview del dominio completo

## 💰 Costos

- **Deploy contrato**: ~0.01-0.02 ETH (una vez, ya hecho)
- **Registrar cada subdominio**: ~0.001-0.003 ETH (por empresa)
- **Total por empresa nueva**: ~0.001-0.003 ETH

## 🐛 Troubleshooting

### Error: "401 Unauthorized" en Alchemy
- Verifica que `ALCHEMY_MAINNET_API_KEY` está correcta
- Verifica que Ethereum Mainnet está habilitado en tu app de Alchemy
- Verifica que la variable está en su propia línea (no mezclada con otras)

### Error: "missing revert data"
- El dominio debe estar wrapped en NameWrapper
- El wallet deployer debe ser owner del dominio wrapped
- Verifica en https://app.ens.domains/ que el dominio está wrapped

### Error: "could not decode result data"
- Normal si el dominio no está wrapped en NameWrapper
- Verifica el estado del dominio en ENS App

### Subdominio no aparece inmediatamente
- Puede tardar 1-2 minutos en aparecer en ENS App
- Verifica la transacción en Etherscan para confirmar éxito
- El subdominio está registrado aunque no aparezca inmediatamente en la UI

## 📚 Archivos de Documentación Creados

- `IMPLEMENTACION_ENS_SUBDOMINIOS.md` (este archivo)
- `VARIABLES_ENTORNO_ENS.md` - Variables de entorno requeridas
- `ENS_SETUP.md` - Guía de setup inicial
- `SETUP_ENS_AHORA.md` - Guía rápida de setup
- `APROBAR_CONTRATO_ENS.md` - Cómo aprobar el contrato (no usado finalmente)
- `INSTRUCCIONES_MIGRACION_SUPABASE.md` - Cómo ejecutar migración SQL

## ✅ Estado Actual

- ✅ Migración SQL implementada
- ✅ Frontend completo con validaciones
- ✅ Backend llamando directamente a NameWrapper
- ✅ Variables de entorno configuradas
- ✅ Contrato desplegado en Mainnet
- ✅ Sistema probado y funcionando
- ✅ Subdominio de prueba registrado: `mueblesgdl.liquifidev.eth`

## 🚀 Próximos Pasos Opcionales

1. **Usar el contrato ENSSubnameRegistrar**: Resolver problemas de permisos para usar el contrato en lugar de llamada directa
2. **Verificación on-chain**: Verificar subdominios ENS en el contrato LoanManager
3. **UI mejorada**: Mostrar dominio ENS en más lugares de la UI
4. **Historial**: Página para ver todos los subdominios registrados

---

**Fecha**: Enero 2025  
**Versión**: 1.0  
**Estado**: ✅ Completado y Funcionando

