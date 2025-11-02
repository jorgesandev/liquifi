# Invoice Amount Calculation Flow

## Current Implementation (MVP - Mocked)

### Step 1: Upload Invoice (`/api/invoices`)

**Location**: `app/api/invoices/route.ts`

```typescript
// Line 41: Currently generates a RANDOM amount
const amount = Math.floor(Math.random() * 100000) + 10000; // Mock amount (10,000 - 110,000)
```

**Status**: ⚠️ **MOCKED** - No parsing del CFDI XML
- Genera un valor aleatorio entre $10,000 y $110,000 MXN
- No extrae el valor real del XML
- Guarda este valor mock en Supabase

### Step 2: Mint NFT (`/api/mint`)

**Location**: `app/api/mint/route.ts`

```typescript
// Uses invoice.amount from Supabase (the mocked value from Step 1)
const invoiceAmount = BigInt(Math.floor(Number(invoice.amount)));
await contract.mintWithMetadata(
  signer.address,
  tokenURIBase64,
  invoice.cfdi_hash,
  invoiceAmount  // This is the mocked amount
);
```

**Status**: ✅ Usa el valor de Supabase y lo guarda en el contrato
- Obtiene `invoice.amount` de Supabase
- Lo mintea al contrato usando `mintWithMetadata()`
- El contrato almacena esto en `InvoiceData.amount`

### Step 3: Borrow (`/api/borrow`)

**Location**: `app/api/borrow/route.ts`

```typescript
// Line 118-132: Tries to get amount from contract, falls back to Supabase
let invoiceData;
try {
  invoiceData = await inftContract.getInvoice(tokenId); // From contract
  invoiceAmount = BigInt(invoiceData.amount.toString());
} catch {
  invoiceAmount = BigInt(Math.floor(Number(invoice.amount))); // From Supabase
}

// Line 134: Calculate 70% LTV
const borrowAmount = (invoiceAmount * BigInt(70)) / BigInt(100);
```

**Status**: ✅ Prioriza el valor del contrato, calcula 70% LTV

**Flujo**:
1. Intenta obtener `amount` del contrato (más confiable)
2. Si falla, usa el valor de Supabase como fallback
3. Calcula préstamo: **70% del valor de la factura**
4. Llama a `LoanManager.initiateLoan(tokenId, borrowAmount, "")`

## LTV (Loan-to-Value) Calculation

```typescript
// Constante en LoanManager.sol
uint256 public constant MAX_LTV_BPS = 7000; // 70%

// En borrow route
borrowAmount = invoiceAmount * 70 / 100
```

**Ejemplo**:
- Factura: $100,000 MXN
- LTV máximo: 70%
- Préstamo máximo: $70,000 MXN

## Current Issues

1. ❌ **Valor mockeado**: No parsea el XML real del CFDI
2. ⚠️ **No valida**: No verifica que el valor sea correcto
3. ⚠️ **No persistente**: Cada upload genera un valor diferente

## How It Should Work (Production)

### Parsing Real CFDI XML

Los CFDI (Comprobante Fiscal Digital por Internet) son XML que contienen:

```xml
<cfdi:Comprobante>
  <cfdi:Conceptos>
    <cfdi:Concepto ...>
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="100000" ... />
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital ... />
  </cfdi:Complemento>
</cfdi:Comprobante>
```

**Campos importantes**:
- `Total`: Monto total de la factura
- `Moneda`: Moneda (MXN, USD, etc.)
- `Fecha`: Fecha de emisión
- `Receptor`: Datos del deudor
- `Emisor`: Datos del emisor

### Implementation Steps

1. **Install XML parser**:
   ```bash
   npm install xml2js fast-xml-parser
   ```

2. **Parse CFDI in `/api/invoices`**:
   ```typescript
   import { XMLParser } from 'fast-xml-parser';
   
   const parser = new XMLParser();
   const xmlContent = buffer.toString('utf-8');
   const cfdi = parser.parse(xmlContent);
   
   const amount = parseFloat(cfdi.Comprobante._attributes.Total || '0');
   const currency = cfdi.Comprobante._attributes.Moneda || 'MXN';
   const date = cfdi.Comprobante._attributes.Fecha;
   const debtorName = cfdi.Comprobante.Receptor._attributes.Nombre;
   ```

3. **Validate CFDI signature** (SAT validation)

4. **Store real values** in Supabase and contract

## Recommendations

### Short Term (MVP)
- ✅ Documentar que es mock
- ✅ Permitir entrada manual del amount (opcional)
- ✅ Validar que amount > 0

### Medium Term
- Implementar parsing básico de XML
- Validar formato CFDI
- Extraer campos principales

### Long Term (Production)
- Validación SAT completa
- Verificación de timbre fiscal
- Integración con servicios de validación CFDI
- Soporte para múltiples monedas
- Conversión de moneda si es necesario

## Current Borrow Flow Summary

```
Upload CFDI
  ↓
Generate random amount (10k-110k) ← MOCKED
  ↓
Save to Supabase
  ↓
Mint NFT with amount
  ↓
Calculate borrow = amount × 70%
  ↓
LoanManager.initiateLoan(tokenId, borrowAmount)
```

