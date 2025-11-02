# LiquiFi - Decentralized Invoice Financing Platform

La nueva forma de acceso a capital que llegó para quedarse. Tecnología Web3 para redefinir el factoraje.

## 📜 Contratos Inteligentes

Estos son los contratos que usa LiquiFi:

- **LiquiFiINFT** - `0x07d0D37cb4cb97ef60c0f881623025b1a2104Eb6` (Arbitrum Sepolia) - Tokeniza facturas como NFTs ERC-721.
- **LiquidityVault** - `0xF831fafDEc6DF2C21830052CDFD504AA759DD850` (Arbitrum Sepolia) - Vault ERC-4626 que gestiona la liquidez del protocolo.
- **LoanManager** - `0xbF7C1287a064a81aa02612562236CdA6A7d614C3` (Arbitrum Sepolia) - Gestiona préstamos con LTV del 70% usando NFTs como colateral.
- **ENSSubnameRegistrar** - `0xa6EA99E4b6eEf5284823DB4A7ad2882480e4cd52` (Ethereum Mainnet) - Registra subdominios ENS para empresas verificadas.
- **USDC** - `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` (Arbitrum Sepolia) - Token USDC real de Circle usado como asset del vault.

## 🎯 Visión

LiquiFi activa el capital congelado de las facturas a través de una plataforma de finanzas descentralizadas que tokeniza facturas. Lo que antes era un documento esperando ser cobrado, hoy es un activo líquido.

**Características principales:**
- **70-85% LTV Disponible**: Obtén hasta el 85% del valor de tu factura en minutos
- **8-15% APY para Inversores**: Rendimientos superiores respaldados por activos reales
- **2-4h Evaluación KYB**: IA evalúa 7 dimensiones de calidad crediticia
- **Liquidez Instantánea**: Minutos, no semanas
- **30-50% más barato** que el factoraje tradicional

## 🏗️ Arquitectura

### Cross-Chain Design

LiquiFi utiliza una arquitectura cross-chain optimizada:

- **L1 (Ethereum Mainnet)**: Gestión de identidad ENS
  - Cada empresa verificada recibe un subdominio ENS (ej: `empresa.liquifidev.eth`)
  - Identidad persistente y verificable on-chain
  - Subdominios se registran automáticamente después de KYB aprobado

- **L2 (Arbitrum Sepolia)**: Protocolo DeFi principal
  - NFTs de facturas (ERC-721)
  - Vault tokenizado ERC-4626
  - Sistema de préstamos con LTV del 70%
  - Costos de gas mínimos para operaciones frecuentes

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, TypeScript, TailwindCSS
- **Web3**: wagmi, viem, ethers.js
- **State Management**: TanStack Query
- **Database**: Supabase (PostgreSQL)
- **Smart Contracts**: Solidity 0.8.24, Hardhat, OpenZeppelin v5
- **Networks**: 
  - Ethereum Mainnet (L1) - ENS Identity
  - Arbitrum Sepolia (L2) - DeFi Protocol

## 📋 Prerequisitos

- Node.js 18+ y npm
- MetaMask o wallet Web3 compatible
- Cuenta de Alchemy con API keys para:
  - Arbitrum Sepolia (L2)
  - Ethereum Mainnet (L1)
- Cuenta de Supabase
- Private key para deployment (con fondos en testnet)
- Dominio ENS padre registrado y wrapped en Mainnet (`liquifidev.eth`)

## ⚙️ Configuración

### 1. Clonar y Instalar

```bash
# Clonar repositorio
git clone <repository-url>
cd liquifi

# Instalar dependencias del proyecto
npm install

# Instalar dependencias de contratos
cd contracts
npm install
cd ..
```

### 2. Variables de Entorno

#### Root `.env.local`

Crea un archivo `.env.local` en la raíz del proyecto. Usa `.env.local.example` como referencia:

```bash
# Alchemy (Arbitrum Sepolia - L2)
NEXT_PUBLIC_ALCHEMY_API_KEY=your-arb-sepolia-key
NEXT_PUBLIC_ALCHEMY_POLICY_ID=your-arb-sepolia-policy-id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Contratos DeFi (Arbitrum Sepolia - L2)
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0x...
NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=0x...

# ENS (Ethereum Mainnet - L1)
NEXT_PUBLIC_ENS_REGISTRAR_MAINNET=0x...
ENS_PARENT_NAME=liquifidev.eth
ALCHEMY_MAINNET_API_KEY=your-mainnet-key
ENS_PARENT_NODE=0x...

# Clave Privada del Deployer (⚠️ SENSIBLE)
DEPLOYER_PRIVATE_KEY=0x...
```

#### Contracts `.env`

Crea un archivo `.env` en `contracts/`:

```bash
# Arbitrum Sepolia (L2)
ALCHEMY_API_KEY=your-arb-sepolia-key
ALCHEMY_POLICY_ID=your-arb-sepolia-policy-id

# Ethereum Mainnet (L1 - ENS)
ALCHEMY_MAINNET_API_KEY=your-mainnet-key

# Deployment
DEPLOYER_PRIVATE_KEY=0x...

# ENS Mainnet Configuration
ENS_PARENT_NAME=liquifidev.eth
ENS_PARENT_NODE=0x... # Calculado con: npm run calculate-namehash liquifidev.eth
```

**⚠️ Seguridad**: Nunca commitees archivos `.env` o `.env.local`. Las claves privadas nunca deben exponerse al cliente.

### 3. Configuración de Supabase

#### Crear Tablas

Ejecuta el siguiente SQL en el SQL Editor de Supabase:

```sql
-- Tabla de facturas
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

-- Tabla de resultados KYB
CREATE TABLE kyb_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  status TEXT NOT NULL,
  ens_label TEXT UNIQUE,
  ens_registered BOOLEAN DEFAULT FALSE,
  ens_registered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de préstamos
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

-- Tabla de registros ENS
CREATE TABLE ens_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL,
  ens_label TEXT NOT NULL UNIQUE,
  full_domain TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  tx_hash TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, ens_label)
);

-- Índices
CREATE INDEX idx_invoices_cfdi_hash ON invoices(cfdi_hash);
CREATE INDEX idx_invoices_nft_token_id ON invoices(nft_token_id);
CREATE INDEX idx_loans_token_id ON loans(token_id);
CREATE INDEX idx_kyb_results_ens_label ON kyb_results(ens_label);
CREATE INDEX idx_ens_registrations_org_id ON ens_registrations(org_id);
```

#### Obtener Claves de Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Settings → API
4. Copia:
   - **URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable Key**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Service Role Key**: `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secreta)

### 4. Configuración de ENS (Mainnet)

#### Pre-requisitos

- Tener `liquifidev.eth` (o tu dominio padre) registrado y wrapped en Mainnet
- Wallet con ETH en Mainnet para gas

#### Calcular Namehash

```bash
cd contracts
npm run calculate-namehash liquifidev.eth
```

Esto genera el `ENS_PARENT_NODE` necesario.

#### Deployment del Contrato ENS

```bash
cd contracts
npm run deploy:mainnet
```

Esto despliega `ENSSubnameRegistrar` en Mainnet. Copia la dirección a `.env.local` como `NEXT_PUBLIC_ENS_REGISTRAR_MAINNET`.

## 🚀 Deployment de Contratos

### Compilar Contratos

```bash
cd contracts
npm run compile
```

### Deploy a Arbitrum Sepolia (L2)

```bash
cd contracts
npm run deploy:arb
```

Este script:
1. Despliega MockUSDC, LiquiFiINFT, LiquidityVault, y LoanManager
2. Configura LoanManager en el Vault
3. Mina tokens iniciales para testing

**Actualiza `.env.local`** con las direcciones de los contratos desplegados.

### Copiar ABIs

```bash
npm run copy-abis
```

Copia los ABIs generados a `/abi` para uso en el frontend.

## 💻 Desarrollo

### Ejecutar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo
npm run build            # Build de producción
npm run lint             # Linter

# Contratos
cd contracts
npm run compile          # Compilar contratos
npm run deploy:arb       # Deploy a Arbitrum Sepolia
npm run deploy:mainnet   # Deploy ENS a Mainnet
npm run calculate-namehash <domain>  # Calcular namehash ENS
```

## 📖 Flujo de Uso

### Para Prestatarios

1. **Conectar Wallet**: Conecta MetaMask (Arbitrum Sepolia)
2. **Subir Factura CFDI**: Sube archivo XML/PDF de factura
3. **Verificación KYB**: 
   - Ingresa nombre de usuario ENS (ej: `miempresa`)
   - Ejecuta KYB (mock, genera score 80-100)
   - Si aprobado, se registra automáticamente `miempresa.liquifidev.eth` en Mainnet
4. **Mintear NFT**: La factura se tokeniza como NFT ERC-721
5. **Solicitar Préstamo**: 
   - Máximo 70% LTV del valor de la factura
   - Si ya tienes ENS registrado, se omite KYB
   - Recibe USDC en minutos
6. **Repagar Préstamo**: Llama a `LoanManager.repayLoan()` para recuperar el NFT

### Para Inversores (Liquidity Providers)

1. **Conectar Wallet**: Conecta MetaMask (Arbitrum Sepolia)
2. **Aprobar USDC**: Aprueba `LiquidityVault` para gastar mUSDC
3. **Depositar**: Deposita USDC en el vault y recibe shares ERC-4626
4. **Ganar Rendimientos**: Obtén 8-15% APY respaldado por préstamos activos
5. **Retirar**: Canjea shares por USDC cuando quieras

## 🏗️ Smart Contracts

### L1: Ethereum Mainnet

#### ENSSubnameRegistrar
- **Propósito**: Gestionar subdominios ENS bajo el dominio padre
- **Features**: Registro automático de subdominios, autorización de wallets
- **Símbolo**: `empresa.liquifidev.eth`

### L2: Arbitrum Sepolia

#### MockUSDC
- **Propósito**: Token ERC-20 de prueba (6 decimales)
- **Features**: Mintable por owner
- **Símbolo**: `mUSDC`

#### LiquiFiINFT
- **Propósito**: NFT ERC-721 para facturas tokenizadas
- **Features**: Metadata completa (deudor, monto, fecha vencimiento, URI)
- **Símbolo**: `LINFT`

#### LiquidityVault
- **Propósito**: Vault ERC-4626 estándar para depósitos LP
- **Features**: 
  - Accounting basado en shares
  - Presta fondos a prestatarios vía LoanManager
  - Acepta NFTs como colateral (ERC721Receiver)
- **Símbolo**: `LQFv` (LiquiFi Vault Share)

#### LoanManager
- **Propósito**: Orquestar préstamos usando NFTs como colateral
- **Features**:
  - Máximo 70% LTV
  - Verificación opcional de autorización ENS
  - Cálculo de interés (10% anual)
  - Manejo de pagos y liquidaciones
- **Seguridad**: ReentrancyGuard, validación de inputs, custom errors

## 🔒 Características de Seguridad

- **ReentrancyGuard** en todas las funciones que modifican estado
- **Custom errors** para eficiencia de gas
- **Validación de inputs** (direcciones cero, fechas, límites LTV)
- **Control de acceso** (Ownable, onlyLoanManager)
- **ERC721Receiver** para transferencias seguras de NFTs
- **Zero-knowledge** KYB (mock en MVP, preparado para integración real)

## 🌐 Deployment en Vercel

### Variables Requeridas

Configura estas 14 variables en Vercel Dashboard → Settings → Environment Variables:

**Variables Públicas (9):**
- `NEXT_PUBLIC_ALCHEMY_API_KEY`
- `NEXT_PUBLIC_ALCHEMY_POLICY_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MOCK_USDC_ADDRESS`
- `NEXT_PUBLIC_INFT_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_LOAN_MANAGER_ADDRESS`
- `NEXT_PUBLIC_ENS_REGISTRAR_MAINNET`

**Variables Privadas (5) - Marcar como Encrypted:**
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️
- `DEPLOYER_PRIVATE_KEY` ⚠️
- `ENS_PARENT_NAME`
- `ALCHEMY_MAINNET_API_KEY`
- `ENS_PARENT_NODE`

Ver `VERCEL_ENV_VARS.txt` para lista completa con valores de ejemplo.

## 🔍 Verificación de Transacciones

### Exploradores de Blockchain

**Arbitrum Sepolia (L2)**:
- Arbiscan: https://sepolia.arbiscan.io/
  - Transaction: `https://sepolia.arbiscan.io/tx/<tx_hash>`
  - Contract: `https://sepolia.arbiscan.io/address/<contract_address>`

**Ethereum Mainnet (L1 - ENS)**:
- Etherscan: https://etherscan.io/
  - Transaction: `https://etherscan.io/tx/<tx_hash>`
  - Contract: `https://etherscan.io/address/<contract_address>`

### Script de Verificación

```bash
npm run verify-tx <transaction_hash>
```

El script verifica:
- Estado de la transacción y uso de gas
- Estado del deployment del contrato
- Event logs
- Proporciona links a exploradores

## 📊 API Routes

- `POST /api/invoices` - Subir y almacenar metadata de factura
- `POST /api/kyb` - Verificación KYB (mock) y registro ENS
- `POST /api/mint` - Mintear NFT de factura (firmado por servidor)
- `POST /api/borrow` - Iniciar préstamo vía LoanManager
- `POST /api/ens/check-label` - Verificar disponibilidad de label ENS
- `POST /api/mint-musdc` - Mint MockUSDC para testing

## 📁 Estructura del Proyecto

```
liquifi/
├── app/
│   ├── api/              # API routes (invoices, kyb, mint, borrow)
│   ├── borrow/           # Página de préstamos
│   ├── invest/           # Página de inversión
│   ├── page.tsx          # Home page
│   └── layout.tsx        # Root layout
├── components/            # Componentes React compartidos
│   ├── ConnectWallet.tsx
│   ├── UploadCFDI.tsx
│   ├── MintInvoice.tsx
│   ├── KYBVerification.tsx
│   ├── VaultActions.tsx
│   └── LoanSummary.tsx
├── lib/
│   ├── wagmi.ts          # Configuración Wagmi
│   ├── supabase.ts       # Cliente Supabase (server-only)
│   └── contracts.ts      # Direcciones y ABIs
├── contracts/
│   ├── contracts/        # Contratos Solidity
│   ├── scripts/          # Scripts de deployment
│   └── hardhat.config.ts
├── abi/                  # ABIs generados
└── supabase/
    └── migrations/        # Migraciones SQL
```

## ⚠️ Notas Importantes

- **MVP Implementation**: 
  - Minting es owner-only. Para producción, agregar control de acceso apropiado.
  - KYB y validación de facturas son **mocked** en MVP.
  - ENS integration es recomendada para producción.

- **Fees**: No hay fees en MVP. En producción, considerar comisiones de factoraje (0.5-1.8%) y performance fees (20% de rendimiento sobre 12% APY).

- **Gas Costs**: 
  - Mint NFT: ~0.0001 ETH (L2)
  - Iniciar préstamo: ~0.0002 ETH (L2)
  - Registrar ENS: ~0.001-0.003 ETH (L1 Mainnet)

- **Testing**: Asegúrate de tener testnet ETH en Arbitrum Sepolia y ETH en Mainnet para operaciones ENS.

## 📄 Licencia

MIT

---

**LiquiFi** - El futuro de las finanzas en Latinoamérica es descentralizado, tokenizado y onchain. Y comienza ahora.
