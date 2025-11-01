# Configuración de Supabase

## Variables Necesarias

Necesitas **DOS** claves diferentes de Supabase:

### 1. Clave para el Cliente (Pública)
Tienes **DOS opciones** - puedes usar cualquiera de las dos:

#### Opción A: PUBLISHABLE_KEY (⭐ Recomendada)
- **Variable**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Uso**: Para acceso desde el cliente (componentes React)
- **Ventaja**: Más segura cuando tienes RLS (Row Level Security) habilitado
- **Donde encontrarla**: Dashboard de Supabase > Settings > API > `Publishable key`
- **Seguridad**: ✅ Segura para usar en el browser si tienes RLS configurado

#### Opción B: ANON_KEY (Tradicional)
- **Variable**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Uso**: Para acceso desde el cliente (componentes React)
- **Donde encontrarla**: Dashboard de Supabase > Settings > API > `anon` `public` key
- **Nota**: Puedes usar esta si no tienes la Publishable key disponible

**El código soporta ambas**, preferirá la Publishable key si está disponible.

### 2. SERVICE_ROLE_KEY (Clave Privada del Servidor)
- **Variable**: `SUPABASE_SERVICE_ROLE_KEY`
- **Uso**: Para operaciones del servidor (API routes) que necesitan permisos elevados
- **Donde encontrarla**: Dashboard de Supabase > Settings > API > `service_role` `secret` key
- **⚠️ IMPORTANTE**: Esta clave NO debe exponerse al cliente. Solo se usa en API routes.

## Cómo Obtener el SERVICE_ROLE_KEY

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** (Configuración) en el menú lateral
4. Click en **API**
5. Busca la sección **Project API keys**
6. Encuentra la clave `service_role` (es la que dice `secret` y está oculta por defecto)
7. Click en el ícono del ojo para revelarla
8. Copia la clave completa

## Configuración en .env.local

Agrega las claves a tu `.env.local`. Puedes usar **PUBLISHABLE_KEY** (recomendado) o **ANON_KEY**:

### Opción 1: Con Publishable Key (Recomendado)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://unedklsriibrejoanhix.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-publishable-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

### Opción 2: Con Anon Key (Alternativa)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://unedklsriibrejoanhix.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZWRrbHNyaWlicmVqb2FuaGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDc0MzAsImV4cCI6MjA3NzU4MzQzMH0.IW2LsxO-A9i56kSEIZdR2bIxhKF7GkD3sFcNax8EFUI
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**Nota**: Si defines ambas, el código usará la `PUBLISHABLE_KEY` por defecto.

## Seguridad

- ✅ `NEXT_PUBLIC_SUPABASE_URL`: Pública, segura para el cliente
- ✅ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Pública, segura para el cliente cuando tienes RLS habilitado
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Pública, segura para el cliente
- ❌ `SUPABASE_SERVICE_ROLE_KEY`: **NUNCA** debe estar en el cliente. Solo en el servidor.

## Diferencias entre las Claves

| Clave | Uso | Seguridad | RLS |
|-------|-----|-----------|-----|
| **Publishable Key** | Cliente/Browser | ✅ Segura con RLS | ✅ Requiere RLS |
| **Anon Key** | Cliente/Browser | ✅ Segura con RLS | ✅ Requiere RLS |
| **Service Role Key** | Solo Servidor | ❌ **NUNCA** exponer al cliente | ⚠️ Bypassa RLS |

**Recomendación**: Usa la **Publishable Key** si está disponible. Es la opción más moderna y segura de Supabase.

