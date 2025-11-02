# Flujo Lógico del Proceso de Préstamos en LiquiFi

## Resumen Ejecutivo

**TODO ES REAL EN EL CONTRATO**, excepto:
- Validación de CFDI (off-chain, mock)
- KYB (off-chain, mock)
- La interfaz frontend es solo UI

---

## Flujo Completo Paso a Paso

### 1. **Subida de Factura (Off-chain)**
- **Ubicación**: `/api/invoices` (backend Next.js)
- **Proceso**:
  - Usuario sube PDF de factura CFDI
  - Backend genera hash SHA256 del archivo
  - Backend genera datos mock: monto (40k-200k USDC), deudor (Walmart/Costco/Pemex)
  - Guarda en Supabase con `status: "uploaded"`
- **Resultado**: Factura en Supabase, sin token aún

---

### 2. **Mint de NFT (On-chain - REAL)**
- **Ubicación**: `/api/mint` (backend) → `LiquiFiINFT.mintInvoice()` (contrato)
- **Proceso**:
  - Backend lee factura de Supabase
  - Llama a `INFT.mintInvoice(to, debtor, amount, dueDate, metadataURI)`
  - **CONTRATO** crea NFT ERC721 con:
    - `tokenId` auto-incremental
    - `InvoiceData` struct con amount, dueDate, debtor, etc.
    - Emite evento `InvoiceMinted`
  - Backend actualiza Supabase: `status: "minted"`, `nft_token_id: tokenId`
- **Resultado**: NFT minted en blockchain, factura vinculada en Supabase

---

### 3. **Inicio de Préstamo (On-chain - REAL)**

#### 3.1 Frontend llama a `/api/borrow`
- **Entrada**: `tokenId`, `borrowerAddress` (opcional)

#### 3.2 Backend valida y prepara

**Validaciones Off-chain (backend):**
1. Verifica que NFT existe: `INFT.ownerOf(tokenId)`
2. Obtiene datos de factura del contrato: `INFT.getInvoice(tokenId)`
3. Busca factura en Supabase por `nft_token_id`
4. Verifica que el vault tiene liquidez suficiente
5. Calcula monto del préstamo: `invoiceAmount * 70%` (LTV)

**Cálculos:**
- `invoiceAmount`: del contrato (más confiable) o Supabase (fallback)
- `maxBorrow = invoiceAmount * 7000 / 10000` (70% LTV)
- `borrowAmount = maxBorrow` (toma el máximo)

#### 3.3 Backend llama al contrato

```solidity
LoanManager.initiateLoan(tokenId, requestedAmount, ensLabel)
```

**Lo que hace el contrato (TODO REAL):**

1. **Validaciones en contrato:**
   - Verifica que `msg.sender` es owner del NFT
   - Obtiene datos de factura del contrato: `INFT.getInvoice(tokenId)`
   - Verifica que `requestedAmount <= maxBorrow` (70% LTV)
   - Verifica que `invoice.dueDate > block.timestamp`

2. **Transferencia de NFT (REAL):**
   ```solidity
   INFT.safeTransferFrom(msg.sender, address(vault), tokenId)
   ```
   - NFT se transfiere al vault como colateral
   - Vault implementa `onERC721Received()` para aceptar el NFT

3. **Creación de Loan struct (REAL):**
   ```solidity
   loans[loanId] = Loan({
     borrower: msg.sender,
     tokenId: tokenId,
     principal: requestedAmount,
     approvedValue: invoice.amount,
     ltvBps: 7000, // 70%
     interestBps: 1000, // 10% anual
     start: block.timestamp,
     due: invoice.dueDate + GRACE_PERIOD,
     active: true
   })
   ```

4. **Préstamo de fondos (REAL):**
   ```solidity
   vault.lendTo(msg.sender, requestedAmount)
   ```
   
   **Dentro del vault:**
   - Verifica que `msg.sender == loanManager` (modifier `onlyLoanManager`)
   - Verifica que `balance >= amount` (revert si no hay liquidez)
   - **Transfiere tokens al borrower**: `IERC20(asset()).safeTransfer(borrower, amount)`
   - Incrementa `totalReceivables += amount`
   - Emite evento `LoanOut`

5. **Emite evento `LoanInitiated`**

---

### 4. **Estado Después del Préstamo (REAL)**

**En el contrato:**
- `loans[loanId].active = true`
- NFT está en el vault (`vault.ownerOf(tokenId)`)
- Borrower recibió los tokens en su wallet
- `vault.totalReceivables` aumentó
- `vault.totalAssets()` incluye receivables

**En Supabase:**
- Factura mantiene `status: "minted"`
- No se crea registro de loan en Supabase (es solo on-chain)

---

### 5. **Pago del Préstamo (On-chain - REAL)**

#### Frontend llama directamente al contrato:
```solidity
LoanManager.repayLoan(loanId, amount)
```

**Lo que hace el contrato:**

1. Valida que loan está activo y `msg.sender == loan.borrower`
2. Calcula interés acumulado
3. Transfiere pago al vault:
   ```solidity
   asset.safeTransferFrom(msg.sender, address(vault), amount)
   ```
4. Vault registra pago:
   ```solidity
   vault.recordRepay(msg.sender, amount)
   ```
   - Reduce `totalReceivables`
5. Libera NFT de vuelta al borrower:
   ```solidity
   vault.releaseNFT(address(INFT), tokenId, borrower)
   ```
6. Marca loan como inactivo: `loans[loanId].active = false`

---

## Qué es Real vs Simulado

### ✅ **TODO REAL (On-chain):**
- Mint de NFT
- Transferencia de NFT al vault
- Validación de LTV
- Cálculo de interés
- Transferencia de tokens al borrower
- Registro de loan en el contrato
- Pago de préstamo
- Liberación de NFT

### 🎭 **Simulado (Off-chain):**
- Validación de CFDI (hash del PDF, pero no se valida XML real)
- KYB (score mock)
- Montos de facturas (generados aleatoriamente 40k-200k)

---

## Problema Actual

El error `0x177e802f` ocurre cuando `LoanManager` llama a `vault.lendTo()`. 

**Posibles causas:**
1. El selector no coincide con errores conocidos → contrato desplegado diferente
2. El vault rechaza la llamada por alguna validación que no estamos viendo
3. SafeERC20 está fallando por alguna razón

**Próximos pasos:**
1. Verificar logs de verificación final del vault
2. Si todo está bien configurado, recompilar y redesplegar contratos

