# 🚨 Migración SQL Requerida - Ejecutar Ahora

El error que estás viendo:
```
column kyb_results.ens_label does not exist
```

**Causa**: La migración SQL aún no se ha ejecutado en Supabase.

## Pasos para Solucionar

### 1. Abre Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto LiquiFi

### 2. Abre el SQL Editor

- En el menú lateral, haz clic en **"SQL Editor"**
- O ve directamente a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql`

### 3. Copia y Pega el SQL

Copia el contenido completo de `supabase/migrations/add_ens_columns.sql`:

```sql
-- Migration: Add ENS columns to kyb_results table
-- Run this in your Supabase SQL editor

-- Add ENS-related columns to kyb_results
ALTER TABLE kyb_results 
ADD COLUMN IF NOT EXISTS ens_label TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS ens_registered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ens_registered_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kyb_results_ens_label ON kyb_results(ens_label);
CREATE INDEX IF NOT EXISTS idx_kyb_results_ens_registered ON kyb_results(ens_registered);

-- Create ens_registrations table for tracking
CREATE TABLE IF NOT EXISTS ens_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL,
  ens_label TEXT NOT NULL UNIQUE,
  full_domain TEXT NOT NULL, -- e.g., "negociomuebles.liquifidev.eth"
  owner_address TEXT NOT NULL,
  tx_hash TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, ens_label)
);

-- Create indexes for ens_registrations
CREATE INDEX IF NOT EXISTS idx_ens_registrations_org_id ON ens_registrations(org_id);
CREATE INDEX IF NOT EXISTS idx_ens_registrations_ens_label ON ens_registrations(ens_label);
CREATE INDEX IF NOT EXISTS idx_ens_registrations_tx_hash ON ens_registrations(tx_hash);
```

### 4. Ejecuta el SQL

1. Pega el SQL en el editor
2. Haz clic en **"RUN"** o presiona `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### 5. Verifica que se Ejecutó Correctamente

Deberías ver un mensaje de éxito. Luego verifica las columnas:

```sql
-- Verificar que las columnas existen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'kyb_results' 
AND column_name IN ('ens_label', 'ens_registered', 'ens_registered_at');
```

Deberías ver 3 filas con las nuevas columnas.

### 6. Reinicia el Servidor de Desarrollo

Después de ejecutar la migración:

```bash
# Detén el servidor (Ctrl+C)
# Reinicia
npm run dev
```

## ✅ Después de Ejecutar

Una vez ejecutada la migración, el error debería desaparecer y podrás:
- ✅ Verificar disponibilidad de labels ENS
- ✅ Registrar subdominios cuando KYB sea aprobado
- ✅ Verificar si una empresa ya tiene ENS registrado

## 🐛 Si Aún Hay Errores

Si después de ejecutar la migración sigues viendo el error:
1. Verifica que ejecutaste el SQL completo (no solo una parte)
2. Verifica que estás en el proyecto correcto de Supabase
3. Espera unos segundos y reinicia el servidor
4. Revisa los logs de Supabase para errores adicionales

